"use server"

import { revalidatePath } from "next/cache"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult } from "@/shared/action-result"
import { findDuplicateOrganizer, findSlugOwner } from "./queries"
import { resolveOrganizerSlug } from "./rules"
import { organizerIdSchema, organizerInputSchema } from "./schemas"

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted ? "That slug is reserved by a deleted organizer. Choose another slug." : "That slug is already in use.",
    { slug: [deleted ? "Reserved by a deleted organizer." : "Already in use."] },
  )

/** Business checks shared by create and update. Returns the data to write or a failure. */
async function prepare(raw: unknown, excludeId?: string) {
  const parsed = organizerInputSchema.safeParse(raw)
  if (!parsed.success) return { failure: fromZodError(parsed.error) }
  const input = parsed.data
  const slug = resolveOrganizerSlug(input)
  if (!slug) return { failure: validationFailure({ slug: ["Enter a slug using letters or numbers."] }) }

  const duplicate = await findDuplicateOrganizer(input, excludeId)
  if (duplicate) {
    return { failure: fail("conflict", `An organizer with the same name, website or Instagram already exists (“${duplicate.name}”).`) }
  }
  const owner = await findSlugOwner(slug)
  if (owner && owner.id !== excludeId) return { failure: slugTaken(owner.deletedAt !== null) }
  return { data: { ...input, slug } }
}

export async function createOrganizer(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const { data, failure } = await prepare(raw)
  if (!data) return failure
  try {
    const { id } = await prisma.organizer.create({ data, select: { id: true } })
    revalidatePath("/admin/organizers")
    return ok({ id })
  } catch (e) {
    if (hasPrismaCode(e, "P2002")) return slugTaken(false) // lost a race with another writer
    throw e
  }
}

export async function updateOrganizer(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = organizerIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Organizer not found.")
  const existing = await prisma.organizer.findFirst({ where: { id: parsedId.data, deletedAt: null }, select: { id: true } })
  if (!existing) return fail("not_found", "Organizer not found.")

  const { data, failure } = await prepare(raw, existing.id)
  if (!data) return failure
  try {
    // metadata and relations are not part of the form, so they are left untouched.
    await prisma.organizer.update({ where: { id: existing.id }, data })
    revalidatePath("/admin/organizers")
    return ok({ id: existing.id })
  } catch (e) {
    if (hasPrismaCode(e, "P2002")) return slugTaken(false)
    throw e
  }
}

export async function deleteOrganizer(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = organizerIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Organizer not found.")

  return prisma.$transaction(async (tx) => {
    const o = await tx.organizer.findFirst({
      where: { id: parsedId.data, deletedAt: null },
      select: {
        _count: {
          select: {
            seriesAssignments: { where: { eventSeries: { deletedAt: null } } },
            editionAssignments: { where: { eventEdition: { deletedAt: null } } },
          },
        },
      },
    })
    if (!o) return fail("not_found", "Organizer not found.")
    const { seriesAssignments, editionAssignments } = o._count
    if (seriesAssignments + editionAssignments > 0) {
      return fail(
        "conflict",
        `This organizer is assigned to ${seriesAssignments} series and ${editionAssignments} edition(s). Remove those assignments before deleting.`,
      )
    }
    await tx.organizer.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/organizers")
    return ok()
  })
}
