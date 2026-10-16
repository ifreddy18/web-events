import "server-only"
import type { Prisma } from "@prisma/client"
import { PHOTOGRAPHER_TYPE_SLUG } from "@/features/photographers/rules"
import { prisma } from "@/server/db/prisma"
import { normalizePhotographerSearchTerm } from "./rules"
import { eventPhotographerIdSchema, PHOTOGRAPHER_SEARCH_PAGE_SIZE, type PhotographerSearchInput } from "./schemas"

/** The role this feature manages. Other roles of `EventServiceProvider` (videographers, …) are never listed or touched. */
export const PHOTOGRAPHER_ROLE = "PHOTOGRAPHER" as const

/** Active assignment rows of an edition: not deleted, on a provider that is not deleted either. */
export const activeEditionPhotographers = (eventEditionId: string) =>
  ({ eventEditionId, role: PHOTOGRAPHER_ROLE, deletedAt: null, provider: { deletedAt: null } }) satisfies Prisma.EventServiceProviderWhereInput

/** Photographers of one edition, ordered by name. Not capped: an edition has a handful, not thousands. */
export async function listEditionPhotographers(eventEditionId: string) {
  if (!eventPhotographerIdSchema.safeParse(eventEditionId).success) return []
  const rows = await prisma.eventServiceProvider.findMany({
    where: activeEditionPhotographers(eventEditionId),
    orderBy: [{ provider: { name: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      accreditation: true,
      description: true,
      provider: { select: { id: true, name: true, slug: true, instagram: true, city: true, countryCode: true } },
    },
  })
  return rows.map(({ provider, ...assignment }) => ({ ...assignment, photographer: provider }))
}

export type EditionPhotographer = Awaited<ReturnType<typeof listEditionPhotographers>>[number]

/**
 * Active photographers matching `q` (name or Instagram handle, case-insensitive substring), a page at a time.
 * Photographers already actively assigned to the edition are returned but flagged, so the picker can show
 * them as unavailable instead of silently hiding them. Deleted providers and other provider types never appear.
 */
export async function searchPhotographersForEdition({ eventEditionId, q, page }: PhotographerSearchInput) {
  const term = normalizePhotographerSearchTerm(q)
  const where: Prisma.ServiceProviderWhereInput = {
    deletedAt: null,
    providerTypes: { some: { type: { slug: PHOTOGRAPHER_TYPE_SLUG } } },
  }
  if (term) {
    const contains = { contains: term, mode: "insensitive" as const }
    where.OR = [{ name: contains }, { instagram: contains }]
  }

  const total = await prisma.serviceProvider.count({ where })
  const rows = await prisma.serviceProvider.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * PHOTOGRAPHER_SEARCH_PAGE_SIZE,
    take: PHOTOGRAPHER_SEARCH_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      instagram: true,
      city: true,
      countryCode: true,
      eventAssignments: { where: { eventEditionId, role: PHOTOGRAPHER_ROLE, deletedAt: null }, select: { id: true } },
    },
  })
  const items = rows.map(({ eventAssignments, ...photographer }) => ({ ...photographer, alreadyAssigned: eventAssignments.length > 0 }))
  return { items, total, page, hasMore: page * PHOTOGRAPHER_SEARCH_PAGE_SIZE < total }
}

export type PhotographerSearchPage = Awaited<ReturnType<typeof searchPhotographersForEdition>>
export type PhotographerSearchItem = PhotographerSearchPage["items"][number]
