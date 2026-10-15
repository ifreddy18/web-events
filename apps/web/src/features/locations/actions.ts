"use server"

import { revalidatePath } from "next/cache"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult } from "@/shared/action-result"
import { findDuplicateLocation, findSlugOwner } from "./queries"
import { resolveLocationSlug } from "./rules"
import { locationIdSchema, locationInputSchema, type LocationInput } from "./schemas"

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted ? "That slug is reserved by a deleted location. Choose another slug." : "That slug is already in use.",
    { slug: [deleted ? "Reserved by a deleted location." : "Already in use."] },
  )

/** Business checks shared by create and update. Returns the data to write or a failure. */
async function prepare(raw: unknown, excludeId?: string) {
  const parsed = locationInputSchema.safeParse(raw)
  if (!parsed.success) return { failure: fromZodError(parsed.error) }
  const input: LocationInput = parsed.data
  const slug = resolveLocationSlug(input)
  if (!slug) return { failure: validationFailure({ slug: ["Enter a slug using letters or numbers."] }) }

  const duplicate = await findDuplicateLocation(input, excludeId)
  if (duplicate) return { failure: fail("conflict", "A location with the same place details already exists.") }
  const owner = await findSlugOwner(slug)
  if (owner && owner.id !== excludeId) return { failure: slugTaken(owner.deletedAt !== null) }
  return { data: { ...input, slug } }
}

export async function createLocation(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const { data, failure } = await prepare(raw)
  if (!data) return failure
  try {
    const { id } = await prisma.location.create({ data, select: { id: true } })
    revalidatePath("/admin/locations")
    return ok({ id })
  } catch (e) {
    if (hasPrismaCode(e, "P2002")) return slugTaken(false) // lost a race with another writer
    throw e
  }
}

export async function updateLocation(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = locationIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Location not found.")
  const existing = await prisma.location.findFirst({ where: { id: parsedId.data, deletedAt: null }, select: { id: true } })
  if (!existing) return fail("not_found", "Location not found.")

  const { data, failure } = await prepare(raw, existing.id)
  if (!data) return failure
  try {
    // metadata is not part of the form, so it is left untouched.
    await prisma.location.update({ where: { id: existing.id }, data })
    revalidatePath("/admin/locations")
    return ok({ id: existing.id })
  } catch (e) {
    if (hasPrismaCode(e, "P2002")) return slugTaken(false)
    throw e
  }
}

export async function deleteLocation(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = locationIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Location not found.")

  return prisma.$transaction(async (tx) => {
    const l = await tx.location.findFirst({
      where: { id: parsedId.data, deletedAt: null },
      select: {
        _count: {
          select: {
            eventEditions: { where: { deletedAt: null } },
            competitions: { where: { deletedAt: null } },
          },
        },
      },
    })
    if (!l) return fail("not_found", "Location not found.")
    const { eventEditions, competitions } = l._count
    if (eventEditions + competitions > 0) {
      return fail(
        "conflict",
        `This location is used by ${eventEditions} edition(s) and ${competitions} competition(s). Reassign them before deleting.`,
      )
    }
    await tx.location.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/locations")
    return ok()
  })
}
