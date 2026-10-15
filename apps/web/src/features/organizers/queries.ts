import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { ORGANIZERS_PAGE_SIZE, organizerIdSchema, organizerListParamsSchema, type OrganizerInput } from "./schemas"

const activeUse = {
  seriesAssignments: { where: { eventSeries: { deletedAt: null } } },
  editionAssignments: { where: { eventEdition: { deletedAt: null } } },
} as const

export function buildOrganizerWhere(q: string): Prisma.OrganizerWhereInput {
  const where: Prisma.OrganizerWhereInput = { deletedAt: null }
  if (q) {
    const contains = { contains: q, mode: "insensitive" as const }
    where.OR = [{ name: contains }, { slug: contains }, { instagram: contains }, { website: contains }, { description: contains }]
  }
  return where
}

export async function listOrganizers(params: { q?: string; page?: number | string } = {}) {
  const { q, page: requested } = organizerListParamsSchema.parse({ q: params.q ?? "", page: params.page ?? 1 })
  const where = buildOrganizerWhere(q)
  const total = await prisma.organizer.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / ORGANIZERS_PAGE_SIZE))
  const page = Math.min(requested, pageCount)
  const rows = await prisma.organizer.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * ORGANIZERS_PAGE_SIZE,
    take: ORGANIZERS_PAGE_SIZE,
    include: { _count: { select: activeUse } },
  })
  const items = rows.map(({ _count, ...o }) => ({
    ...o,
    metadata: undefined,
    seriesCount: _count.seriesAssignments,
    editionCount: _count.editionAssignments,
  }))
  return { items, total, page, pageCount, pageSize: ORGANIZERS_PAGE_SIZE, q }
}

export async function getOrganizer(id: string) {
  if (!organizerIdSchema.safeParse(id).success) return null
  const o = await prisma.organizer.findFirst({ where: { id, deletedAt: null } })
  return o ? { ...o, metadata: undefined } : null
}

/**
 * Likely the same organizer among non-deleted rows: same name (case-insensitive), or the same
 * website / Instagram handle when provided.
 */
export function findDuplicateOrganizer(input: OrganizerInput, excludeId?: string) {
  const identity: Prisma.OrganizerWhereInput[] = [{ name: { equals: input.name, mode: "insensitive" } }]
  if (input.website) identity.push({ website: input.website })
  if (input.instagram) identity.push({ instagram: input.instagram })
  return prisma.organizer.findFirst({
    where: { deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: identity },
    select: { id: true, name: true },
  })
}

/** Slug owner including soft-deleted rows (slugs stay reserved). */
export function findSlugOwner(slug: string) {
  return prisma.organizer.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
}
