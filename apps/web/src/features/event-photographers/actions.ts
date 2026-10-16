"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { PHOTOGRAPHER_TYPE_SLUG } from "@/features/photographers/rules"
import { denied } from "@/server/auth/admin-guard"
import { prisma } from "@/server/db/prisma"
import { fail, fromZodError, hasPrismaCode, ok, validationFailure, type ActionResult } from "@/shared/action-result"
import { PHOTOGRAPHER_ROLE, searchPhotographersForEdition, type PhotographerSearchPage } from "./queries"
import {
  assignmentCreateSchema,
  assignmentDetailsSchema,
  eventPhotographerIdSchema,
  photographerSearchSchema,
} from "./schemas"

// Photographers of an edition are EventServiceProvider rows with role PHOTOGRAPHER (see README.md).
//
// Transaction and locking conventions:
//   * Lock order, always: edition row (FOR SHARE) -> provider row (FOR SHARE) -> assignment row (FOR UPDATE).
//     - Edition FOR SHARE pairs with the FOR UPDATE of updateEventEdition / deleteEventEdition (and is the same
//       first lock competitions take), so an assignment cannot appear under an edition that is being deleted.
//     - Provider FOR SHARE pairs with the FOR UPDATE of deletePhotographer, which counts active assignments:
//       either the delete commits first (we then see deleted_at and refuse) or we commit first (it then sees
//       our row and refuses). Without the share lock both could succeed against a stale count.
//     - Assignment FOR UPDATE serializes concurrent restores/updates/removals of the same row.
//   * Nobody takes these locks in another order: editions never lock providers, deleting a provider locks only its
//     own row, and a share lock never conflicts with another share lock, so assignments of different providers
//     (or the same provider in different editions) run in parallel.
//   * Every write is one transaction: lock, re-check, then write last.

const editionNotFound = () => fail("not_found", "Edition not found.")
const assignmentNotFound = () => fail("not_found", "Photographer assignment not found.")
const photographerUnavailable = () => validationFailure({ providerId: ["Select an active photographer."] })

const alreadyAssigned = () =>
  fail("conflict", "This photographer is already assigned to this edition.", { providerId: ["Already assigned to this edition."] })

const referenceGone = () => fail("conflict", "The edition or photographer is no longer available. Reload and try again.")

function mapWriteError(error: unknown) {
  if (hasPrismaCode(error, "P2002")) return alreadyAssigned() // lost a race on (edition, provider, role)
  if (hasPrismaCode(error, "P2003")) return referenceGone()
  return null
}

async function lockActiveEditionShared(tx: Prisma.TransactionClient, eventEditionId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM event_editions WHERE id = ${eventEditionId}::uuid AND deleted_at IS NULL FOR SHARE`
  return rows.length > 0
}

/** Share-locks the provider (pairs with `deletePhotographer`) and reports whether it is an active photographer. */
async function lockActivePhotographerShared(tx: Prisma.TransactionClient, providerId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM service_providers WHERE id = ${providerId}::uuid AND deleted_at IS NULL FOR SHARE`
  if (rows.length === 0) return false
  const photographerLinks = await tx.serviceProviderToType.count({
    where: { providerId, type: { slug: PHOTOGRAPHER_TYPE_SLUG } },
  })
  return photographerLinks > 0
}

/** Share-locks the provider without requiring it to be active: removing an assignment must keep working. */
async function lockProviderShared(tx: Prisma.TransactionClient, providerId: string) {
  await tx.$queryRaw`SELECT id FROM service_providers WHERE id = ${providerId}::uuid FOR SHARE`
}

type LockedAssignment = { id: string; deleted_at: Date | null }

/** Row-locks the assignment with this identity, deleted or not (the unique key reserves deleted rows too). */
async function lockAssignmentByKey(tx: Prisma.TransactionClient, eventEditionId: string, providerId: string) {
  const rows = await tx.$queryRaw<LockedAssignment[]>`
    SELECT id, deleted_at FROM event_service_providers
    WHERE event_edition_id = ${eventEditionId}::uuid AND provider_id = ${providerId}::uuid
      AND role = ${PHOTOGRAPHER_ROLE}::"ServiceProviderRole"
    FOR UPDATE`
  return rows[0] ?? null
}

async function lockActiveAssignment(tx: Prisma.TransactionClient, assignmentId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM event_service_providers WHERE id = ${assignmentId}::uuid AND deleted_at IS NULL FOR UPDATE`
  return rows.length > 0
}

/** Identity of an active photographer assignment on a live edition; both ids are immutable, so reading them before locking is safe. */
function findLiveAssignment(assignmentId: string) {
  return prisma.eventServiceProvider.findFirst({
    where: { id: assignmentId, role: PHOTOGRAPHER_ROLE, deletedAt: null, eventEdition: { deletedAt: null } },
    select: { eventEditionId: true, providerId: true },
  })
}

function revalidateEdition(eventEditionId: string) {
  revalidatePath(`/admin/event-editions/${eventEditionId}/edit`)
}

/**
 * Assigns a photographer to an edition. The unique key (edition, provider, role) also covers removed rows, so
 * re-adding a previously removed photographer RESTORES that row (keeping its id, which galleries will reference)
 * and applies the newly submitted accreditation and note instead of inserting a duplicate.
 */
export async function addEventPhotographer(raw: unknown): Promise<ActionResult<{ id: string; restored: boolean }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsed = assignmentCreateSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)
  const { eventEditionId, providerId, accreditation, description } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveEditionShared(tx, eventEditionId))) return editionNotFound()
      if (!(await lockActivePhotographerShared(tx, providerId))) return photographerUnavailable()

      const existing = await lockAssignmentByKey(tx, eventEditionId, providerId)
      if (existing && existing.deleted_at === null) return alreadyAssigned()
      if (existing) {
        await tx.eventServiceProvider.update({ where: { id: existing.id }, data: { deletedAt: null, accreditation, description } })
        return { id: existing.id, restored: true }
      }
      const created = await tx.eventServiceProvider.create({
        data: { eventEditionId, providerId, role: PHOTOGRAPHER_ROLE, accreditation, description },
        select: { id: true },
      })
      return { id: created.id, restored: false }
    })
    if ("ok" in result) return result
    revalidateEdition(eventEditionId)
    return ok(result)
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

/** Changes accreditation and note. The photographer and the edition are the assignment's identity and never change. */
export async function updateEventPhotographer(id: unknown, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventPhotographerIdSchema.safeParse(id)
  if (!parsedId.success) return assignmentNotFound()
  const parsed = assignmentDetailsSchema.safeParse(raw)
  if (!parsed.success) return fromZodError(parsed.error)

  const existing = await findLiveAssignment(parsedId.data)
  if (!existing) return assignmentNotFound()

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!(await lockActiveEditionShared(tx, existing.eventEditionId))) return editionNotFound()
      if (!(await lockActivePhotographerShared(tx, existing.providerId))) return assignmentNotFound()
      if (!(await lockActiveAssignment(tx, parsedId.data))) return assignmentNotFound()
      await tx.eventServiceProvider.update({ where: { id: parsedId.data }, data: parsed.data })
      return null
    })
    if (result) return result
    revalidateEdition(existing.eventEditionId)
    return ok({ id: parsedId.data })
  } catch (error) {
    const mapped = mapWriteError(error)
    if (mapped) return mapped
    throw error
  }
}

/**
 * Soft-removes the photographer from the edition (sets `deletedAt`). The profile, the edition and every other
 * assignment are untouched; the row stays as history and keeps its identity reserved, so adding the photographer
 * again restores it. Does not require the provider to be active, so a stale assignment can always be cleaned up.
 *
 * Blocked while active EventResource rows (galleries) are attributed to the assignment, like deleting an edition with
 * children: otherwise a gallery would point at a photographer who is no longer part of the edition. Code that creates
 * such a resource must take the assignment row FOR SHARE and re-check `deleted_at`, the same pairing as the other locks.
 */
export async function removeEventPhotographer(id: unknown): Promise<ActionResult> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsedId = eventPhotographerIdSchema.safeParse(id)
  if (!parsedId.success) return assignmentNotFound()
  const existing = await findLiveAssignment(parsedId.data)
  if (!existing) return assignmentNotFound()

  const result = await prisma.$transaction(async (tx) => {
    if (!(await lockActiveEditionShared(tx, existing.eventEditionId))) return editionNotFound()
    await lockProviderShared(tx, existing.providerId)
    if (!(await lockActiveAssignment(tx, parsedId.data))) return assignmentNotFound()
    const galleryLinks = await tx.eventResource.count({ where: { eventServiceProviderId: parsedId.data, deletedAt: null } })
    if (galleryLinks > 0) {
      return fail("conflict", `This photographer still has ${galleryLinks} gallery link(s) in this edition. Remove them before removing the photographer.`)
    }
    await tx.eventServiceProvider.update({ where: { id: parsedId.data }, data: { deletedAt: new Date() } })
    return null
  })
  if (result) return result
  revalidateEdition(existing.eventEditionId)
  return ok()
}

/** Server-side search for the picker. A read, but it lists admin data, so it is authorized like a mutation. */
export async function searchEditionPhotographerCandidates(raw: unknown): Promise<ActionResult<PhotographerSearchPage>> {
  const unauthorized = await denied()
  if (unauthorized) return unauthorized
  const parsed = photographerSearchSchema.safeParse(raw)
  if (!parsed.success) return editionNotFound()
  const edition = await prisma.eventEdition.findFirst({ where: { id: parsed.data.eventEditionId, deletedAt: null }, select: { id: true } })
  if (!edition) return editionNotFound()
  return ok(await searchPhotographersForEdition(parsed.data))
}
