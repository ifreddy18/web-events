import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { PHOTOGRAPHER_TYPE_SLUG } from "./rules"
import { PHOTOGRAPHERS_PAGE_SIZE, photographerIdSchema, photographerListParamsSchema, type PhotographerInput } from "./schemas"

/** Non-deleted providers classified as photographers. */
const isPhotographer = { providerTypes: { some: { type: { slug: PHOTOGRAPHER_TYPE_SLUG } } } } satisfies Prisma.ServiceProviderWhereInput

const activeDisciplines = { where: { discipline: { deletedAt: null, sport: { deletedAt: null } } } } as const

export function buildPhotographerWhere(params: { q: string; disciplineId?: string }): Prisma.ServiceProviderWhereInput {
  const where: Prisma.ServiceProviderWhereInput = { deletedAt: null, ...isPhotographer }
  if (params.disciplineId) where.disciplines = { some: { disciplineId: params.disciplineId } }
  if (params.q) {
    const contains = { contains: params.q, mode: "insensitive" as const }
    where.OR = [
      { name: contains },
      { slug: contains },
      { instagram: contains },
      { website: contains },
      { email: contains },
      { city: contains },
      { description: contains },
    ]
  }
  return where
}

export async function listPhotographers(params: { q?: string; disciplineId?: string; page?: number | string } = {}) {
  const parsed = photographerListParamsSchema.parse({
    q: params.q ?? "",
    disciplineId: params.disciplineId || undefined,
    page: params.page ?? 1,
  })
  const { q, disciplineId } = parsed
  const where = buildPhotographerWhere({ q, disciplineId })
  const total = await prisma.serviceProvider.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / PHOTOGRAPHERS_PAGE_SIZE))
  const page = Math.min(parsed.page, pageCount)
  const rows = await prisma.serviceProvider.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * PHOTOGRAPHERS_PAGE_SIZE,
    take: PHOTOGRAPHERS_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      instagram: true,
      website: true,
      email: true,
      city: true,
      countryCode: true,
      disciplines: { ...activeDisciplines, select: { discipline: { select: { name: true } } }, orderBy: { discipline: { name: "asc" } } },
    },
  })
  const items = rows.map(({ disciplines, ...photographer }) => ({
    ...photographer,
    disciplineNames: disciplines.map((assignment) => assignment.discipline.name),
  }))
  return { items, total, page, pageCount, pageSize: PHOTOGRAPHERS_PAGE_SIZE, q, disciplineId }
}

export async function getPhotographer(id: string) {
  if (!photographerIdSchema.safeParse(id).success) return null
  const photographer = await prisma.serviceProvider.findFirst({
    where: { id, deletedAt: null, ...isPhotographer },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      instagram: true,
      website: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      city: true,
      countryCode: true,
      disciplines: { ...activeDisciplines, select: { disciplineId: true } },
    },
  })
  if (!photographer) return null
  const { disciplines, ...profile } = photographer
  return { ...profile, disciplineIds: disciplines.map((assignment) => assignment.disciplineId) }
}

/**
 * Likely the same profile among non-deleted providers, matched on reliable identifiers only:
 * Instagram handle, website or email. Names are deliberately not compared: different
 * photographers (or studios) may share a display name.
 */
export function findDuplicatePhotographer(input: Pick<PhotographerInput, "instagram" | "website" | "email">, excludeId?: string) {
  const identifiers: Prisma.ServiceProviderWhereInput[] = []
  if (input.instagram) identifiers.push({ instagram: input.instagram })
  if (input.website) identifiers.push({ website: input.website })
  if (input.email) identifiers.push({ email: input.email })
  if (identifiers.length === 0) return Promise.resolve(null)
  return prisma.serviceProvider.findFirst({
    where: { deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: identifiers },
    select: { id: true, name: true, instagram: true, website: true, email: true },
  })
}

/** Slug owner including soft-deleted rows (slugs stay reserved). */
export function findSlugOwner(slug: string) {
  return prisma.serviceProvider.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
}

/** Every slug (deleted ones included) equal to `base` or starting with `base-`, to pick a free suffix. */
export async function listSlugsStartingWith(base: string) {
  const rows = await prisma.serviceProvider.findMany({
    where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
    select: { slug: true },
  })
  return new Set(rows.map((row) => row.slug))
}

/** Active disciplines (of active sports) for the profile form and the list filter. */
export async function listDisciplineOptions() {
  const rows = await prisma.discipline.findMany({
    where: { deletedAt: null, sport: { deletedAt: null } },
    orderBy: [{ sport: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, sport: { select: { name: true } } },
  })
  return rows.map((discipline) => ({ id: discipline.id, label: discipline.name, sportName: discipline.sport.name }))
}
