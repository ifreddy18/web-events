"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult } from "@/shared/action-result"
import { findDuplicateSeries, findSlugOwner } from "./queries"
import { desiredAssignments, diffAssignments, resolveSeriesSlug } from "./rules"
import { eventSeriesIdSchema, eventSeriesInputSchema } from "./schemas"

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted ? "That slug is reserved by a deleted series. Choose another slug." : "That slug is already in use.",
    { slug: [deleted ? "Reserved by a deleted series." : "Already in use."] },
  )

const refGone = () => fail("conflict", "A selected discipline or organizer is no longer available. Reload and try again.")

/** Validation and pre-checks shared by create and update (no writes). */
async function prepare(raw: unknown, excludeId?: string) {
  const parsed = eventSeriesInputSchema.safeParse(raw)
  if (!parsed.success) return { failure: fromZodError(parsed.error) }
  const { primaryOrganizerId, coOrganizerIds, ...input } = parsed.data
  const slug = resolveSeriesSlug(input)
  if (!slug) return { failure: validationFailure({ slug: ["Enter a slug using letters or numbers."] }) }

  // Required references must exist and be active (the DB FKs cannot see soft deletes).
  const discipline = await prisma.discipline.count({ where: { id: input.disciplineId, deletedAt: null, sport: { deletedAt: null } } })
  if (!discipline) return { failure: validationFailure({ disciplineId: ["Select an active discipline."] }) }
  const assignments = desiredAssignments({ primaryOrganizerId, coOrganizerIds })
  const found = await prisma.organizer.findMany({
    where: { id: { in: assignments.map((a) => a.organizerId) }, deletedAt: null },
    select: { id: true },
  })
  const active = new Set(found.map((o) => o.id))
  if (!active.has(primaryOrganizerId)) return { failure: validationFailure({ primaryOrganizerId: ["Select an active organizer."] }) }
  if (coOrganizerIds.some((id) => !active.has(id))) {
    return { failure: validationFailure({ coOrganizerIds: ["One or more co-organizers are not available."] }) }
  }

  const duplicate = await findDuplicateSeries(input, excludeId)
  if (duplicate) return { failure: fail("conflict", "A series with this name already exists in that discipline.") }
  const owner = await findSlugOwner(slug)
  if (owner && owner.id !== excludeId) return { failure: slugTaken(owner.deletedAt !== null) }
  return { data: { fields: { ...input, slug }, assignments } }
}

/** Re-verifies, inside the transaction and under a share lock, that the organizers are still active. */
async function lockActiveOrganizers(tx: Prisma.TransactionClient, ids: string[]) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM organizers WHERE id = ANY(${ids}::uuid[]) AND deleted_at IS NULL ORDER BY id FOR SHARE`
  return rows.length === ids.length
}

function mapWriteError(e: unknown) {
  if (hasPrismaCode(e, "P2002")) return slugTaken(false) // slug or PRIMARY/organizer uniqueness lost a race
  if (hasPrismaCode(e, "P2003")) return refGone()
  return null
}

export async function createEventSeries(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const { data, failure } = await prepare(raw)
  if (!data) return failure
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveOrganizers(tx, data.assignments.map((a) => a.organizerId)))) return null
      return tx.eventSeries.create({
        data: { ...data.fields, organizers: { create: data.assignments } },
        select: { id: true },
      })
    })
    if (!result) return refGone()
    revalidatePath("/admin/event-series")
    return ok({ id: result.id })
  } catch (e) {
    const mapped = mapWriteError(e)
    if (mapped) return mapped
    throw e
  }
}

export async function updateEventSeries(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventSeriesIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Series not found.")
  const seriesId = parsedId.data
  const exists = await prisma.eventSeries.count({ where: { id: seriesId, deletedAt: null } })
  if (!exists) return fail("not_found", "Series not found.")

  const { data, failure } = await prepare(raw, seriesId)
  if (!data) return failure
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize concurrent edits/deletes of this series, then re-check it is still active.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM event_series WHERE id = ${seriesId}::uuid AND deleted_at IS NULL FOR UPDATE`
      if (locked.length === 0) return "gone" as const
      if (!(await lockActiveOrganizers(tx, data.assignments.map((a) => a.organizerId)))) return "ref" as const

      const current = await tx.eventSeriesOrganizer.findMany({
        where: { eventSeriesId: seriesId },
        select: { organizerId: true, role: true },
      })
      const { remove, demote, promote, add } = diffAssignments(current, data.assignments)
      const where = (ids: string[]) => ({ eventSeriesId: seriesId, organizerId: { in: ids } })
      if (remove.length) await tx.eventSeriesOrganizer.deleteMany({ where: where(remove) })
      if (demote.length) await tx.eventSeriesOrganizer.updateMany({ where: where(demote), data: { role: "CO_ORGANIZER" } })
      if (promote.length) await tx.eventSeriesOrganizer.updateMany({ where: where(promote), data: { role: "PRIMARY" } })
      if (add.length) await tx.eventSeriesOrganizer.createMany({ data: add.map((a) => ({ ...a, eventSeriesId: seriesId })) })
      // Fields last: a slug collision (P2002) then rolls the assignment changes back too.
      // metadata is not part of the form, so it is left untouched.
      await tx.eventSeries.update({ where: { id: seriesId }, data: data.fields })
      return "ok" as const
    })
    if (result === "gone") return fail("not_found", "Series not found.")
    if (result === "ref") return refGone()
    revalidatePath("/admin/event-series")
    return ok({ id: seriesId })
  } catch (e) {
    const mapped = mapWriteError(e)
    if (mapped) return mapped
    throw e
  }
}

export async function deleteEventSeries(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventSeriesIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Series not found.")

  return prisma.$transaction(async (tx) => {
    // Same row lock as update; edition creation must take it too before adding editions.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM event_series WHERE id = ${parsedId.data}::uuid AND deleted_at IS NULL FOR UPDATE`
    if (locked.length === 0) return fail("not_found", "Series not found.")
    const editions = await tx.eventEdition.count({ where: { eventSeriesId: parsedId.data, deletedAt: null } })
    if (editions > 0) {
      return fail("conflict", `This series has ${editions} edition(s). Delete or reassign them before deleting the series.`)
    }
    // Organizer assignments are kept: they are the historical template of a soft-deleted row.
    await tx.eventSeries.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/event-series")
    return ok()
  })
}
