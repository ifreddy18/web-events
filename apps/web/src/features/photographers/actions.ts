"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult } from "@/shared/action-result"
import { findDuplicatePhotographer, findSlugOwner, listSlugsStartingWith } from "./queries"
import { diffDisciplineIds, firstFreeSlug, PHOTOGRAPHER_TYPE_SLUG, resolvePhotographerSlugBase } from "./rules"
import { photographerIdSchema, photographerInputSchema, type PhotographerInput } from "./schemas"

// Photographers are ServiceProvider rows linked to the "photographer" ServiceProviderType.
//
// Transaction and lock conventions (same style as event editions / organizers):
//   * Lock order, always: provider row (FOR UPDATE) -> discipline rows (FOR SHARE, ORDER BY id).
//     Deleting a provider takes only its own row, so no path takes these locks in another order.
//   * The profile fields, the type link and the discipline assignments change in ONE transaction,
//     so a failed assignment never leaves a half-saved profile.
//   * Discipline assignments are diffed, not rewritten: untouched rows keep their id and createdAt.
//     Assignments to disciplines that are no longer active are invisible in the form and left alone.
//   * Other provider types, tags, media (ServiceProviderMedia) and event assignments are never touched.

const notFound = () => fail("not_found", "Photographer not found.")
const disciplineGone = () => fail("conflict", "A selected discipline is no longer available. Reload and try again.")

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted ? "That slug is reserved by a deleted provider. Choose another slug." : "That slug is already in use.",
    { slug: [deleted ? "Reserved by a deleted provider." : "Already in use."] },
  )

function duplicateFailure(match: NonNullable<Awaited<ReturnType<typeof findDuplicatePhotographer>>>, input: PhotographerInput) {
  const fieldErrors: Record<string, string[]> = {}
  if (input.instagram && match.instagram === input.instagram) fieldErrors.instagram = ["Already used by another profile."]
  if (input.website && match.website === input.website) fieldErrors.website = ["Already used by another profile."]
  if (input.email && match.email === input.email) fieldErrors.email = ["Already used by another profile."]
  return fail("conflict", `A profile with the same Instagram, website or email already exists (“${match.name}”).`, fieldErrors)
}

type Failure = ReturnType<typeof fail>
type Prepared = { data: { input: PhotographerInput; slug: string }; failure?: undefined } | { data?: undefined; failure: Failure }

/** Validation and read-only business checks shared by create and update. */
async function prepare(raw: unknown, existing?: { id: string; slug: string }): Promise<Prepared> {
  const parsed = photographerInputSchema.safeParse(raw)
  if (!parsed.success) return { failure: fromZodError(parsed.error) }
  const input = parsed.data

  const duplicate = await findDuplicatePhotographer(input, existing?.id)
  if (duplicate) return { failure: duplicateFailure(duplicate, input) }

  const slug = await resolveSlug(input, existing)
  if (slug.failure) return { failure: slug.failure }

  const activeDisciplineCount = await prisma.discipline.count({
    where: { id: { in: input.disciplineIds }, deletedAt: null, sport: { deletedAt: null } },
  })
  if (activeDisciplineCount !== input.disciplineIds.length) {
    return { failure: validationFailure({ disciplineIds: ["One or more selected disciplines are not available."] }) }
  }
  return { data: { input, slug: slug.value } }
}

/**
 * An explicit slug must be free. A generated one gets a numeric suffix instead of an error, because two
 * photographers sharing a display name is normal. On update, an empty slug keeps the current one.
 */
async function resolveSlug(input: PhotographerInput, existing?: { id: string; slug: string }) {
  if (input.slug) {
    const owner = await findSlugOwner(input.slug)
    if (owner && owner.id !== existing?.id) return { failure: slugTaken(owner.deletedAt !== null) }
    return { value: input.slug }
  }
  if (existing) return { value: existing.slug }
  const base = resolvePhotographerSlugBase(input)
  if (!base) return { failure: validationFailure({ slug: ["Enter a slug using letters or numbers."] }) }
  return { value: firstFreeSlug(base, await listSlugsStartingWith(base)) }
}

/** Re-verifies, under a share lock, that the disciplines are still active. Call after locking the provider. */
async function lockActiveDisciplines(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length === 0) return true
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT d.id FROM disciplines d JOIN sports s ON s.id = d.sport_id
    WHERE d.id = ANY(${ids}::uuid[]) AND d.deleted_at IS NULL AND s.deleted_at IS NULL
    ORDER BY d.id FOR SHARE OF d`
  return rows.length === ids.length
}

/** Columns of ServiceProvider written from the form; relations (types, disciplines) are handled separately. */
function profileFields(input: PhotographerInput, slug: string) {
  const { name, description, instagram, website, email, phone, profileImageUrl, city, countryCode } = input
  return { name, slug, description, instagram, website, email, phone, profileImageUrl, city, countryCode }
}

function mapWriteError(error: unknown) {
  if (hasPrismaCode(error, "P2002")) return slugTaken(false) // slug or assignment uniqueness lost a race
  if (hasPrismaCode(error, "P2003")) return disciplineGone()
  return null
}

export async function createPhotographer(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const { data, failure } = await prepare(raw)
  if (!data) return failure
  const { input, slug } = data

  try {
    return await prisma.$transaction(async (tx) => {
      const photographerType = await tx.serviceProviderType.findUnique({ where: { slug: PHOTOGRAPHER_TYPE_SLUG }, select: { id: true } })
      if (!photographerType) {
        return fail("conflict", "The “photographer” provider type is missing. Load the catalog seed first (pnpm db:seed).")
      }
      if (!(await lockActiveDisciplines(tx, input.disciplineIds))) return disciplineGone()
      const { id } = await tx.serviceProvider.create({
        data: {
          ...profileFields(input, slug),
          providerTypes: { create: { typeId: photographerType.id } },
          disciplines: { create: input.disciplineIds.map((disciplineId) => ({ disciplineId })) },
        },
        select: { id: true },
      })
      revalidatePath("/admin/photographers")
      return ok({ id })
    })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function updatePhotographer(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = photographerIdSchema.safeParse(id)
  if (!parsedId.success) return notFound()
  const existing = await prisma.serviceProvider.findFirst({
    where: { id: parsedId.data, deletedAt: null, providerTypes: { some: { type: { slug: PHOTOGRAPHER_TYPE_SLUG } } } },
    select: { id: true, slug: true },
  })
  if (!existing) return notFound()

  const { data, failure } = await prepare(raw, existing)
  if (!data) return failure
  const { input, slug } = data

  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM service_providers WHERE id = ${existing.id}::uuid AND deleted_at IS NULL FOR UPDATE`
      if (locked.length === 0) return notFound()
      if (!(await lockActiveDisciplines(tx, input.disciplineIds))) return disciplineGone()

      await tx.serviceProvider.update({ where: { id: existing.id }, data: profileFields(input, slug) })

      const currentAssignments = await tx.serviceProviderDiscipline.findMany({
        where: { providerId: existing.id, discipline: { deletedAt: null, sport: { deletedAt: null } } },
        select: { disciplineId: true },
      })
      const { remove, add } = diffDisciplineIds(
        currentAssignments.map((assignment) => assignment.disciplineId),
        input.disciplineIds,
      )
      if (remove.length > 0) {
        await tx.serviceProviderDiscipline.deleteMany({ where: { providerId: existing.id, disciplineId: { in: remove } } })
      }
      if (add.length > 0) {
        await tx.serviceProviderDiscipline.createMany({ data: add.map((disciplineId) => ({ providerId: existing.id, disciplineId })) })
      }
      revalidatePath("/admin/photographers")
      return ok({ id: existing.id })
    })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

/**
 * Soft delete, blocked while the photographer is assigned to a non-deleted edition through a non-deleted
 * EventServiceProvider row. Historical rows (deleted assignments or editions) never block and are never touched.
 *
 * Concurrency: the provider row is locked FOR UPDATE. Any future EventServiceProvider mutation must take the
 * provider row FOR SHARE (and re-check `deleted_at IS NULL`) inside its transaction, the same pairing as
 * organizers, so an assignment and this delete cannot both succeed against a stale count.
 */
export async function deletePhotographer(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = photographerIdSchema.safeParse(id)
  if (!parsedId.success) return notFound()

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM service_providers WHERE id = ${parsedId.data}::uuid FOR UPDATE`
    const photographer = await tx.serviceProvider.findFirst({
      where: { id: parsedId.data, deletedAt: null, providerTypes: { some: { type: { slug: PHOTOGRAPHER_TYPE_SLUG } } } },
      select: { id: true, _count: { select: { eventAssignments: { where: { deletedAt: null, eventEdition: { deletedAt: null } } } } } },
    })
    if (!photographer) return notFound()
    const activeAssignments = photographer._count.eventAssignments
    if (activeAssignments > 0) {
      return fail(
        "conflict",
        `This photographer is assigned to ${activeAssignments} active event edition(s). Unassign them from those events before deleting.`,
      )
    }
    await tx.serviceProvider.update({ where: { id: photographer.id }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/photographers")
    return ok()
  })
}
