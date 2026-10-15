"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import {
  addFieldError,
  fail,
  fromZodError,
  hasPrismaCode,
  ok,
  validationFailure,
  type ActionResult,
  type FieldErrors,
} from "@/shared/action-result"
import { localDateFromDb, localDateToDb } from "@/shared/local-date"
import { resolveCompetitionMetadata } from "./metadata"
import { deriveCompetitionSlug, validateCompetitionSchedule } from "./rules"
import {
  competitionCreateSchema,
  competitionIdSchema,
  competitionUpdateSchema,
  type CompetitionCreateInput,
  type CompetitionUpdateInput,
} from "./schemas"

// Transaction and locking conventions (see README.md for the reasoning):
//   * Every write is one transaction: lock, check, then write last, so a lost slug race (P2002) or a
//     failed check leaves nothing behind.
//   * Lock order, always: edition row (FOR SHARE) -> competition row (FOR UPDATE) -> location row
//     (FOR SHARE). The edition is share-locked, not update-locked, so competitions of the same
//     edition can be written in parallel; it still conflicts with the FOR UPDATE that edition
//     updates and deletes take, which is what keeps the schedule validation below true until commit.
//   * Deleting a competition takes only its own row, so it can never be part of a lock cycle.

type Failure = ReturnType<typeof fail>
type WriteInput = CompetitionCreateInput | CompetitionUpdateInput

const slugTaken = (deleted: boolean) =>
  fail(
    "conflict",
    deleted
      ? "That slug is reserved by a deleted competition in this edition. Choose another slug."
      : "That slug is already used by another competition in this edition.",
    { slug: [deleted ? "Reserved by a deleted competition." : "Already in use in this edition."] },
  )

const refGone = () => fail("conflict", "The selected edition, discipline or location is no longer available. Reload and try again.")

function mapWriteError(error: unknown) {
  if (hasPrismaCode(error, "P2002")) return slugTaken(false) // lost a race on (edition, slug)
  if (hasPrismaCode(error, "P2003")) return refGone()
  return null
}

async function lockActiveEditionShared(tx: Prisma.TransactionClient, editionId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM event_editions WHERE id = ${editionId}::uuid AND deleted_at IS NULL FOR SHARE`
  return rows.length > 0
}

async function lockActiveCompetition(tx: Prisma.TransactionClient, competitionId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM competitions WHERE id = ${competitionId}::uuid AND deleted_at IS NULL FOR UPDATE`
  return rows.length > 0
}

async function lockActiveLocation(tx: Prisma.TransactionClient, locationId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM locations WHERE id = ${locationId}::uuid AND deleted_at IS NULL FOR SHARE`
  return rows.length > 0
}

/**
 * Everything that depends on current database state. Must run inside the transaction after the
 * edition (and, on update, competition) locks are held: the edition's dates are read here, after
 * the lock, so they cannot change before commit.
 *
 * Field errors are collected rather than returned one by one so the admin sees all of them at once.
 */
async function verifyAgainstDatabase(
  tx: Prisma.TransactionClient,
  params: {
    eventEditionId: string
    input: WriteInput
    slug: string
    /** Present on update: the competition being edited and what it currently stores. */
    existing?: { id: string; disciplineId: string; metadata: unknown }
  },
): Promise<{ failure: Failure } | { metadata: Record<string, unknown> | null }> {
  const { eventEditionId, input, slug, existing } = params
  const errors: FieldErrors = {}

  if (input.locationId && !(await lockActiveLocation(tx, input.locationId))) {
    addFieldError(errors, "locationId", "Select an active location.")
  }

  const discipline = await tx.discipline.findFirst({
    where: { id: input.disciplineId, deletedAt: null, sport: { deletedAt: null } },
    select: { slug: true },
  })
  if (!discipline) addFieldError(errors, "disciplineId", "Select an active discipline.")

  let metadata: Record<string, unknown> | null = null
  if (discipline) {
    const resolution = resolveCompetitionMetadata({
      disciplineSlug: discipline.slug,
      submitted: input.metadata,
      stored: existing?.metadata ?? null,
      disciplineChanged: existing !== undefined && existing.disciplineId !== input.disciplineId,
      discardStored: "discardStoredMetadata" in input && input.discardStoredMetadata,
    })
    if (resolution.ok) metadata = resolution.metadata
    else {
      for (const [field, messages] of Object.entries(resolution.fieldErrors)) {
        for (const message of messages) addFieldError(errors, field, message)
      }
    }
  }

  // Dates and times are checked against the locked edition through the shared rules, which also
  // cover inheritance, edition boundaries and same-day time order.
  const edition = await tx.eventEdition.findUniqueOrThrow({
    where: { id: eventEditionId },
    select: { startsOn: true, endsOn: true, locationId: true },
  })
  const scheduleIssues = validateCompetitionSchedule(
    { startsOn: localDateFromDb(edition.startsOn), endsOn: localDateFromDb(edition.endsOn), locationId: edition.locationId },
    {
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      startTime: input.startTime,
      endTime: input.endTime,
      locationId: input.locationId,
    },
  )
  for (const issue of scheduleIssues) addFieldError(errors, issue.field, issue.message)

  if (Object.keys(errors).length > 0) return { failure: validationFailure(errors) }

  // Slugs are unique per edition, including soft-deleted rows (their slug stays reserved).
  const slugOwner = await tx.competition.findUnique({
    where: { eventEditionId_slug: { eventEditionId, slug } },
    select: { id: true, deletedAt: true },
  })
  if (slugOwner && slugOwner.id !== existing?.id) return { failure: slugTaken(slugOwner.deletedAt !== null) }

  return { metadata }
}

/** Column values shared by create and update; `metadata` is resolved separately. */
function competitionColumns(input: WriteInput, slug: string) {
  return {
    name: input.name,
    slug,
    description: input.description,
    status: input.status,
    participationType: input.participationType,
    disciplineId: input.disciplineId,
    locationId: input.locationId,
    startsOn: input.startsOn && localDateToDb(input.startsOn),
    endsOn: input.endsOn && localDateToDb(input.endsOn),
    startTime: input.startTime,
    endTime: input.endTime,
    registrationUrl: input.registrationUrl,
  } satisfies Prisma.CompetitionUncheckedUpdateInput
}

const noSlug = () => validationFailure({ slug: ["Enter a slug using letters or numbers."] })
const toJsonColumn = (metadata: Record<string, unknown> | null) => (metadata === null ? Prisma.DbNull : (metadata as Prisma.InputJsonObject))

export async function createCompetition(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsed = competitionCreateSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)
  const input = parsed.data
  const slug = input.slug || deriveCompetitionSlug(input.name)
  if (!slug) return noSlug()

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveEditionShared(tx, input.eventEditionId))) {
        return validationFailure({ eventEditionId: ["Select an active edition."] })
      }
      const prepared = await verifyAgainstDatabase(tx, { eventEditionId: input.eventEditionId, input, slug })
      if ("failure" in prepared) return prepared.failure
      return tx.competition.create({
        data: { ...competitionColumns(input, slug), eventEditionId: input.eventEditionId, metadata: toJsonColumn(prepared.metadata) },
        select: { id: true },
      })
    })
    if ("ok" in result) return result
    revalidatePath("/admin/competitions")
    return ok({ id: result.id })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function updateCompetition(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = competitionIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Competition not found.")
  const competitionId = parsedId.data
  // The parent edition never changes after creation, so reading it before taking the locks is safe.
  const found = await prisma.competition.findFirst({ where: { id: competitionId, deletedAt: null }, select: { eventEditionId: true } })
  if (!found) return fail("not_found", "Competition not found.")

  const parsed = competitionUpdateSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)
  const input = parsed.data
  const slug = input.slug || deriveCompetitionSlug(input.name)
  if (!slug) return noSlug()

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveEditionShared(tx, found.eventEditionId))) return fail("not_found", "Competition not found.")
      // Row lock: two edits of the same competition must not merge metadata from a stale read.
      if (!(await lockActiveCompetition(tx, competitionId))) return fail("not_found", "Competition not found.")

      const stored = await tx.competition.findUniqueOrThrow({ where: { id: competitionId }, select: { disciplineId: true, metadata: true } })
      const prepared = await verifyAgainstDatabase(tx, {
        eventEditionId: found.eventEditionId,
        input,
        slug,
        existing: { id: competitionId, disciplineId: stored.disciplineId, metadata: stored.metadata },
      })
      if ("failure" in prepared) return prepared.failure
      await tx.competition.update({
        where: { id: competitionId },
        data: { ...competitionColumns(input, slug), metadata: toJsonColumn(prepared.metadata) },
      })
      return null
    })
    if (result) return result
    revalidatePath("/admin/competitions")
    return ok({ id: competitionId })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

export async function deleteCompetition(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = competitionIdSchema.safeParse(id)
  if (!parsedId.success) return fail("not_found", "Competition not found.")

  return prisma.$transaction(async (tx) => {
    // Same row lock as update. Code that adds Results must take this row FOR SHARE and re-check
    // deletedAt, so a result cannot appear under a competition that is being deleted.
    if (!(await lockActiveCompetition(tx, parsedId.data))) return fail("not_found", "Competition not found.")
    // Results are the only table that references a competition. Removing the competition from
    // the admin lists would orphan them, so active results block the deletion.
    const results = await tx.result.count({ where: { competitionId: parsedId.data, deletedAt: null } })
    if (results > 0) {
      return fail("conflict", `This competition still has ${results} result(s). Remove them before deleting the competition.`)
    }
    // The slug stays reserved within the edition and the row keeps its history. No restore yet.
    await tx.competition.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    revalidatePath("/admin/competitions")
    return ok()
  })
}
