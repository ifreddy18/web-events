import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { EVENT_SERIES_PAGE_SIZE, eventSeriesIdSchema, eventSeriesListParamsSchema, type EventSeriesInput } from "./schemas"

export function buildSeriesWhere(p: { q: string; status?: EventSeriesInput["status"]; disciplineId?: string }): Prisma.EventSeriesWhereInput {
  const where: Prisma.EventSeriesWhereInput = { deletedAt: null }
  if (p.status) where.status = p.status
  if (p.disciplineId) where.disciplineId = p.disciplineId
  if (p.q) {
    const contains = { contains: p.q, mode: "insensitive" as const }
    where.OR = [
      { name: contains },
      { slug: contains },
      { description: contains },
      { instagram: contains },
      { discipline: { name: contains } },
      { discipline: { sport: { name: contains } } },
      { organizers: { some: { organizer: { deletedAt: null, name: contains } } } },
    ]
  }
  return where
}

export async function listEventSeries(params: { q?: string; page?: number | string; status?: string; disciplineId?: string } = {}) {
  const parsed = eventSeriesListParamsSchema.parse({
    q: params.q ?? "",
    page: params.page ?? 1,
    status: params.status || undefined,
    disciplineId: params.disciplineId || undefined,
  })
  const { q, status, disciplineId } = parsed
  const where = buildSeriesWhere({ q, status, disciplineId })
  const total = await prisma.eventSeries.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / EVENT_SERIES_PAGE_SIZE))
  const page = Math.min(parsed.page, pageCount)
  const rows = await prisma.eventSeries.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * EVENT_SERIES_PAGE_SIZE,
    take: EVENT_SERIES_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      discipline: { select: { name: true, sport: { select: { name: true } } } },
      organizers: {
        where: { organizer: { deletedAt: null } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: { role: true, organizer: { select: { name: true } } },
      },
      _count: { select: { editions: { where: { deletedAt: null } } } },
    },
  })
  const items = rows.map(({ organizers, _count, discipline, ...s }) => ({
    ...s,
    disciplineName: discipline.name,
    sportName: discipline.sport.name,
    primaryOrganizer: organizers.find((o) => o.role === "PRIMARY")?.organizer.name ?? null,
    coOrganizerCount: organizers.filter((o) => o.role === "CO_ORGANIZER").length,
    editionCount: _count.editions,
  }))
  return { items, total, page, pageCount, pageSize: EVENT_SERIES_PAGE_SIZE, q, status, disciplineId }
}

export async function getEventSeries(id: string) {
  if (!eventSeriesIdSchema.safeParse(id).success) return null
  const s = await prisma.eventSeries.findFirst({
    where: { id, deletedAt: null },
    include: { organizers: { where: { organizer: { deletedAt: null } }, select: { organizerId: true, role: true } } },
  })
  if (!s) return null
  const { organizers, ...rest } = s
  return {
    ...rest,
    metadata: undefined,
    primaryOrganizerId: organizers.find((o) => o.role === "PRIMARY")?.organizerId ?? "",
    coOrganizerIds: organizers.filter((o) => o.role === "CO_ORGANIZER").map((o) => o.organizerId),
  }
}

/** Active disciplines (of active sports) for the form's selector and the list filter. */
export async function listDisciplineOptions() {
  const rows = await prisma.discipline.findMany({
    where: { deletedAt: null, sport: { deletedAt: null } },
    orderBy: [{ sport: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, sport: { select: { name: true } } },
  })
  return rows.map((d) => ({ id: d.id, label: `${d.sport.name} · ${d.name}` }))
}

/** Active organizers for the assignment pickers. */
export function listOrganizerOptions() {
  return prisma.organizer.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, name: true },
  })
}

/** Same series (name within a discipline, case-insensitive) among non-deleted rows. */
export function findDuplicateSeries(input: Pick<EventSeriesInput, "name" | "disciplineId">, excludeId?: string) {
  return prisma.eventSeries.findFirst({
    where: {
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      disciplineId: input.disciplineId,
      name: { equals: input.name, mode: "insensitive" },
    },
    select: { id: true, name: true },
  })
}

/** Slug owner including soft-deleted rows (slugs stay reserved). */
export function findSlugOwner(slug: string) {
  return prisma.eventSeries.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
}
