"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { validateCompetitionSchedule } from "@/features/competitions/rules"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult, type FieldErrors } from "@/shared/action-result"
import { localDateFromDb, localDateToDb, zonedDateTimeToInstant } from "@/shared/local-date"
import { desiredAssignments, diffAssignments, type Assignment } from "@/shared/organizer-assignments"
import { findIndistinguishableEdition } from "./queries"
import { deriveEditionSlug } from "./rules"
import {
  eventEditionCreateSchema,
  eventEditionIdSchema,
  eventEditionUpdateSchema,
  type EventEditionCreateInput,
  type EventEditionUpdateInput,
} from "./schemas"

// Transaction and locking conventions (see README.md for the reasoning):
//   * Every write happens in one transaction; checks first, writes last, so a lost slug race (P2002)
//     rolls everything back.
//   * Lock order, always: series row (FOR UPDATE) -> edition row (FOR UPDATE) -> location row
//     (FOR SHARE) -> organizer rows (FOR SHARE, ORDER BY id). Deleting a location or an organizer
//     takes only its own row with FOR UPDATE, so no code path takes these locks in another order.
//   * The series lock is the same one EventSeries edits/deletes take: it serializes edition
//     creation against "delete the series" and against changes to the organizer template being copied.

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted ? "That slug is reserved by a deleted edition. Choose another slug." : "That slug is already in use.",
    { slug: [deleted ? "Reserved by a deleted edition." : "Already in use."] },
  )

const refGone = () => fail("conflict", "A selected series, location or organizer is no longer available. Reload and try again.")

type ValidInput = EventEditionCreateInput | EventEditionUpdateInput

function mapWriteError(error: unknown) {
  if (hasPrismaCode(error, "P2002")) return slugTaken(false) // lost a race on the globally unique slug
  if (hasPrismaCode(error, "P2003")) return refGone()
  return null
}

async function lockActiveSeries(tx: Prisma.TransactionClient, seriesId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM event_series WHERE id = ${seriesId}::uuid AND deleted_at IS NULL FOR UPDATE`
  return rows.length > 0
}

async function lockActiveEdition(tx: Prisma.TransactionClient, editionId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM event_editions WHERE id = ${editionId}::uuid AND deleted_at IS NULL FOR UPDATE`
  return rows.length > 0
}

async function lockActiveLocation(tx: Prisma.TransactionClient, locationId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM locations WHERE id = ${locationId}::uuid AND deleted_at IS NULL FOR SHARE`
  return rows.length > 0
}

/** Share-locks the organizers (pairs with the FOR UPDATE in deleteOrganizer) and returns the active ids. */
async function lockActiveOrganizers(tx: Prisma.TransactionClient, ids: string[]) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM organizers WHERE id = ANY(${ids}::uuid[]) AND deleted_at IS NULL ORDER BY id FOR SHARE`
  return new Set(rows.map((row) => row.id))
}

function missingOrganizerErrors(assignments: Assignment[], active: Set<string>): FieldErrors | null {
  const errors: FieldErrors = {}
  for (const { organizerId, role } of assignments) {
    if (active.has(organizerId)) continue
    if (role === "PRIMARY") errors.primaryOrganizerId = ["Select an active organizer."]
    else errors.coOrganizerIds = ["One or more co-organizers are not available."]
  }
  return Object.keys(errors).length > 0 ? errors : null
}

/** The series' own template, restricted to organizers that are still active. */
async function copySeriesTemplate(tx: Prisma.TransactionClient, eventSeriesId: string): Promise<Assignment[]> {
  const template = await tx.eventSeriesOrganizer.findMany({
    where: { eventSeriesId, organizer: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: { organizerId: true, role: true },
  })
  return template
}

/**
 * Checks that depend on current database state. Must run inside the transaction after the series
 * (and edition) locks are held, so the answers stay true until commit.
 */
async function verifyReferencesAndIdentity(
  tx: Prisma.TransactionClient,
  input: ValidInput,
  slug: string,
  assignments: Assignment[],
  eventSeriesId: string,
  excludeEditionId?: string,
) {
  if (input.locationId && !(await lockActiveLocation(tx, input.locationId))) {
    return validationFailure({ locationId: ["Select an active location."] })
  }
  const active = await lockActiveOrganizers(tx, assignments.map((a) => a.organizerId))
  const organizerErrors = missingOrganizerErrors(assignments, active)
  if (organizerErrors) return validationFailure(organizerErrors)

  const sibling = await findIndistinguishableEdition({ eventSeriesId, year: input.year, label: input.label }, excludeEditionId, tx)
  if (sibling) {
    const message = input.label
      ? `This series already has an edition in ${input.year} labeled “${input.label}”.`
      : `This series already has an unlabeled edition in ${input.year}. Add a label (e.g. “Spring”, “II”) to tell them apart.`
    return fail("conflict", message, { label: [message] })
  }
  const owner = await tx.eventEdition.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
  if (owner && owner.id !== excludeEditionId) return slugTaken(owner.deletedAt !== null)
  return null
}

/** Column values shared by create and update. `metadata` is deliberately absent: the form never edits it. */
function editionColumns(input: ValidInput, slug: string) {
  return {
    name: input.name,
    slug,
    label: input.label,
    year: input.year,
    locationId: input.locationId,
    startsOn: input.startsOn && localDateToDb(input.startsOn),
    endsOn: input.endsOn && localDateToDb(input.endsOn),
    startTime: input.startTime,
    endTime: input.endTime,
    timeZone: input.timeZone,
    rescheduledFromOn: input.rescheduledFromOn && localDateToDb(input.rescheduledFromOn),
    // Typed as wall-clock time at the event; stored as the matching instant (no server/browser zone involved).
    registrationOpenAt: input.registrationOpenAt && zonedDateTimeToInstant(input.registrationOpenAt, input.timeZone),
    registrationCloseAt: input.registrationCloseAt && zonedDateTimeToInstant(input.registrationCloseAt, input.timeZone),
    registrationStatus: input.registrationStatus,
    registrationUrl: input.registrationUrl,
    resultsUrl: input.resultsUrl,
    publicationStatus: input.publicationStatus,
    status: input.status,
  } satisfies Prisma.EventEditionUncheckedUpdateInput
}

function resolveSlug(input: ValidInput) {
  return input.slug || deriveEditionSlug(input)
}

const noSlug = () => validationFailure({ slug: ["Enter a slug using letters or numbers."] })

export async function createEventEdition(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsed = eventEditionCreateSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)
  const input = parsed.data
  const slug = resolveSlug(input)
  if (!slug) return noSlug()

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveSeries(tx, input.eventSeriesId))) {
        return validationFailure({ eventSeriesId: ["Select an active series."] })
      }

      // Organizers: the admin's (possibly edited) selection, or a copy of the series template when none
      // was sent. Either way the edition then owns its rows; the series template is never read again.
      let assignments: Assignment[]
      if (input.primaryOrganizerId === undefined) {
        assignments = await copySeriesTemplate(tx, input.eventSeriesId)
        if (!assignments.some((a) => a.role === "PRIMARY")) {
          return validationFailure({ primaryOrganizerId: ["The series has no active primary organizer. Select one."] })
        }
      } else {
        assignments = desiredAssignments({ primaryOrganizerId: input.primaryOrganizerId, coOrganizerIds: input.coOrganizerIds })
      }

      const failure = await verifyReferencesAndIdentity(tx, input, slug, assignments, input.eventSeriesId)
      if (failure) return failure
      return tx.eventEdition.create({
        data: { ...editionColumns(input, slug), eventSeriesId: input.eventSeriesId, organizers: { create: assignments } },
        select: { id: true },
      })
    })
    if ("ok" in result) return result
    revalidatePath("/admin/event-editions")
    return ok({ id: result.id })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function updateEventEdition(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventEditionIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Edition not found.")
  const editionId = parsedId.data
  // The series of an edition never changes, so reading it before taking the locks is safe.
  const existing = await prisma.eventEdition.findFirst({
    where: { id: editionId, deletedAt: null },
    select: { eventSeriesId: true },
  })
  if (!existing) return fail("not_found", "Edition not found.")

  const parsed = eventEditionUpdateSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)
  const input = parsed.data
  const slug = resolveSlug(input)
  if (!slug) return noSlug()

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveSeries(tx, existing.eventSeriesId))) return fail("not_found", "Edition not found.")
      if (!(await lockActiveEdition(tx, editionId))) return fail("not_found", "Edition not found.")

      const assignments = desiredAssignments(input)
      const failure = await verifyReferencesAndIdentity(tx, input, slug, assignments, existing.eventSeriesId, editionId)
      if (failure) return failure

      const scheduleConflict = await findCompetitionScheduleConflict(tx, editionId, input)
      if (scheduleConflict) return scheduleConflict

      // Own assignments only: the series template is untouched. Order matters because the database
      // allows a single PRIMARY per edition: remove, demote, promote, then add.
      const current = await tx.eventEditionOrganizer.findMany({ where: { eventEditionId: editionId }, select: { organizerId: true, role: true } })
      const { remove, demote, promote, add } = diffAssignments(current, assignments)
      const rows = (organizerIds: string[]) => ({ eventEditionId: editionId, organizerId: { in: organizerIds } })
      if (remove.length) await tx.eventEditionOrganizer.deleteMany({ where: rows(remove) })
      if (demote.length) await tx.eventEditionOrganizer.updateMany({ where: rows(demote), data: { role: "CO_ORGANIZER" } })
      if (promote.length) await tx.eventEditionOrganizer.updateMany({ where: rows(promote), data: { role: "PRIMARY" } })
      if (add.length) await tx.eventEditionOrganizer.createMany({ data: add.map((a) => ({ ...a, eventEditionId: editionId })) })
      // Edition columns last: a slug collision (P2002) rolls the assignment changes back too.
      await tx.eventEdition.update({ where: { id: editionId }, data: editionColumns(input, slug) })
      return null
    })
    if (result) return result
    revalidatePath("/admin/event-editions")
    return ok({ id: editionId })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

/**
 * Competitions inherit the edition's dates, so a new date window must still fit every active
 * competition. Reuses the competition rules; only checked when the dates actually change, so an
 * unrelated edit is never blocked by a competition that was already inconsistent.
 */
async function findCompetitionScheduleConflict(tx: Prisma.TransactionClient, editionId: string, input: EventEditionUpdateInput) {
  const current = await tx.eventEdition.findUniqueOrThrow({ where: { id: editionId }, select: { startsOn: true, endsOn: true } })
  const datesChanged = localDateFromDb(current.startsOn) !== input.startsOn || localDateFromDb(current.endsOn) !== input.endsOn
  if (!datesChanged) return null

  const competitions = await tx.competition.findMany({
    where: { eventEditionId: editionId, deletedAt: null },
    select: { name: true, startsOn: true, endsOn: true, startTime: true, endTime: true, locationId: true },
  })
  const edition = { startsOn: input.startsOn, endsOn: input.endsOn, locationId: input.locationId }
  const conflicting = competitions.filter(
    (competition) =>
      validateCompetitionSchedule(edition, {
        ...competition,
        startsOn: localDateFromDb(competition.startsOn),
        endsOn: localDateFromDb(competition.endsOn),
      }).length > 0,
  )
  if (conflicting.length === 0) return null
  const names = conflicting.map((competition) => competition.name).join(", ")
  const message = `The new dates conflict with competition(s): ${names}. Adjust those competitions first.`
  return fail("conflict", message, { startsOn: [message] })
}

export async function deleteEventEdition(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventEditionIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Edition not found.")

  return prisma.$transaction(async (tx) => {
    // Same row lock as update. Competition creation (and the other edition children) must take
    // this row FOR SHARE and re-check deletedAt, so a child cannot appear under a deleted edition.
    if (!(await lockActiveEdition(tx, parsedId.data))) return fail("not_found", "Edition not found.")
    const active = { eventEditionId: parsedId.data, deletedAt: null }
    const [competitions, providers, resources, media] = await Promise.all([
      tx.competition.count({ where: active }),
      tx.eventServiceProvider.count({ where: active }),
      tx.eventResource.count({ where: active }),
      tx.eventEditionMedia.count({ where: active }),
    ])
    if (competitions + providers + resources + media > 0) {
      return fail(
        "conflict",
        `This edition still has ${competitions} competition(s), ${providers} service provider(s), ${resources} resource(s) and ${media} media item(s). Remove them before deleting the edition.`,
      )
    }
    // Organizer assignments stay as the edition's history; the slug stays reserved.
    await tx.eventEdition.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/event-editions")
    return ok()
  })
}
