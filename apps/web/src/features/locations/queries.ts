import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { LOCATIONS_PAGE_SIZE, locationIdSchema, locationListParamsSchema, type LocationInput } from "./schemas"

const activeUse = {
  eventEditions: { where: { deletedAt: null } },
  competitions: { where: { deletedAt: null } },
} as const

const toNumber = (d: { toNumber(): number } | null) => (d ? d.toNumber() : null)

export function buildLocationWhere(q: string): Prisma.LocationWhereInput {
  const where: Prisma.LocationWhereInput = { deletedAt: null }
  if (q) {
    const contains = { contains: q, mode: "insensitive" as const }
    where.OR = [
      { venueName: contains },
      { city: contains },
      { state: contains },
      { country: contains },
      { address: contains },
      { slug: contains },
    ]
  }
  return where
}

export async function listLocations(params: { q?: string; page?: number | string } = {}) {
  const { q, page: requested } = locationListParamsSchema.parse({ q: params.q ?? "", page: params.page ?? 1 })
  const where = buildLocationWhere(q)
  const total = await prisma.location.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / LOCATIONS_PAGE_SIZE))
  const page = Math.min(requested, pageCount)
  const rows = await prisma.location.findMany({
    where,
    orderBy: [{ country: "asc" }, { state: "asc" }, { city: "asc" }, { venueName: "asc" }, { id: "asc" }],
    skip: (page - 1) * LOCATIONS_PAGE_SIZE,
    take: LOCATIONS_PAGE_SIZE,
    include: { _count: { select: activeUse } },
  })
  const items = rows.map(({ latitude, longitude, _count, ...l }) => ({
    ...l,
    metadata: undefined,
    latitude: toNumber(latitude),
    longitude: toNumber(longitude),
    editionCount: _count.eventEditions,
    competitionCount: _count.competitions,
  }))
  return { items, total, page, pageCount, pageSize: LOCATIONS_PAGE_SIZE, q }
}

export async function getLocation(id: string) {
  if (!locationIdSchema.safeParse(id).success) return null
  const l = await prisma.location.findFirst({ where: { id, deletedAt: null } })
  if (!l) return null
  return { ...l, latitude: toNumber(l.latitude), longitude: toNumber(l.longitude), metadata: undefined }
}

/** Same place (case-insensitive, null-aware) among non-deleted locations. */
export function findDuplicateLocation(input: LocationInput, excludeId?: string) {
  const same = (v: string | null) => (v === null ? null : { equals: v, mode: "insensitive" as const })
  return prisma.location.findFirst({
    where: {
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      country: { equals: input.country, mode: "insensitive" },
      state: same(input.state),
      city: same(input.city),
      venueName: same(input.venueName),
      address: same(input.address),
    },
    select: { id: true, slug: true },
  })
}

/** Slug owner including soft-deleted rows (slugs stay reserved). */
export function findSlugOwner(slug: string) {
  return prisma.location.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
}
