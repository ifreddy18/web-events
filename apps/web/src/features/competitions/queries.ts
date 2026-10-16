import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { localDateFromDb } from "@/shared/local-date"
import { resolveEffectiveSchedule } from "./rules"
import { COMPETITIONS_PAGE_SIZE, competitionIdSchema, competitionListParamsSchema } from "./schemas"

type ListFilters = {
  q: string
  status?: Prisma.CompetitionWhereInput["status"]
  participationType?: Prisma.CompetitionWhereInput["participationType"]
  eventEditionId?: string
  disciplineId?: string
}

type LocationFields = { venueName: string | null; city: string | null; deletedAt: Date | null }
const locationSelect = { venueName: true, city: true, deletedAt: true } as const

function locationLabel(location: LocationFields | null) {
  if (!location || location.deletedAt) return null
  return [location.venueName, location.city].filter(Boolean).join(", ") || null
}

export function buildCompetitionWhere(filters: ListFilters): Prisma.CompetitionWhereInput {
  const where: Prisma.CompetitionWhereInput = { deletedAt: null, eventEdition: { deletedAt: null } }
  if (filters.status) where.status = filters.status
  if (filters.participationType) where.participationType = filters.participationType
  if (filters.eventEditionId) where.eventEditionId = filters.eventEditionId
  if (filters.disciplineId) where.disciplineId = filters.disciplineId
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const }
    const locationMatch = { deletedAt: null, OR: [{ venueName: contains }, { city: contains }, { state: contains }] }
    where.OR = [
      { name: contains },
      { slug: contains },
      { eventEdition: { name: contains } },
      { eventEdition: { eventSeries: { name: contains } } },
      { discipline: { name: contains } },
      { location: locationMatch },
      // The effective location is the edition's when the competition has none of its own.
      { locationId: null, eventEdition: { location: locationMatch } },
    ]
  }
  return where
}

export async function listCompetitions(
  params: { q?: string; page?: number | string; status?: string; participationType?: string; eventEditionId?: string; disciplineId?: string } = {},
) {
  const parsed = competitionListParamsSchema.parse({
    q: params.q ?? "",
    page: params.page ?? 1,
    status: params.status || undefined,
    participationType: params.participationType || undefined,
    eventEditionId: params.eventEditionId || undefined,
    disciplineId: params.disciplineId || undefined,
  })
  const { page: requestedPage, ...filters } = parsed
  const where = buildCompetitionWhere(filters)
  const total = await prisma.competition.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / COMPETITIONS_PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const rows = await prisma.competition.findMany({
    where,
    // Grouped by edition (newest year first), then by own start date with undated ones last, then
    // by time. Name and id make the order total so pages never overlap.
    orderBy: [
      { eventEdition: { year: "desc" } },
      { eventEdition: { name: "asc" } },
      { startsOn: { sort: "asc", nulls: "last" } },
      { startTime: { sort: "asc", nulls: "last" } },
      { name: "asc" },
      { id: "asc" },
    ],
    skip: (page - 1) * COMPETITIONS_PAGE_SIZE,
    take: COMPETITIONS_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      participationType: true,
      startsOn: true,
      endsOn: true,
      startTime: true,
      endTime: true,
      locationId: true,
      location: { select: locationSelect },
      discipline: { select: { name: true } },
      eventEdition: {
        select: {
          name: true,
          year: true,
          startsOn: true,
          endsOn: true,
          locationId: true,
          location: { select: locationSelect },
          eventSeries: { select: { name: true } },
        },
      },
    },
  })
  const items = rows.map((row) => {
    const { eventEdition } = row
    const effective = resolveEffectiveSchedule(
      { startsOn: localDateFromDb(eventEdition.startsOn), endsOn: localDateFromDb(eventEdition.endsOn), locationId: eventEdition.locationId },
      {
        startsOn: localDateFromDb(row.startsOn),
        endsOn: localDateFromDb(row.endsOn),
        startTime: row.startTime,
        endTime: row.endTime,
        locationId: row.locationId,
      },
    )
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      participationType: row.participationType,
      disciplineName: row.discipline.name,
      editionName: eventEdition.name,
      editionYear: eventEdition.year,
      seriesName: eventEdition.eventSeries.name,
      effectiveStartsOn: effective.startsOn,
      effectiveEndsOn: effective.endsOn,
      startTime: effective.startTime,
      endTime: effective.endTime,
      datesInherited: row.startsOn === null,
      locationLabel: locationLabel(row.location) ?? locationLabel(eventEdition.location),
      locationInherited: row.locationId === null,
    }
  })
  return { items, total, page, pageCount, pageSize: COMPETITIONS_PAGE_SIZE, ...filters }
}

/** One competition shaped for the edit form: dates as strings, the parent edition's schedule for the hints. */
export async function getCompetition(id: string) {
  if (!competitionIdSchema.safeParse(id).success) return null
  const competition = await prisma.competition.findFirst({
    where: { id, deletedAt: null, eventEdition: { deletedAt: null } },
    include: {
      discipline: { select: { slug: true } },
      eventEdition: { select: { id: true, name: true, year: true, startsOn: true, endsOn: true, location: { select: locationSelect } } },
    },
  })
  if (!competition) return null
  const { eventEdition, discipline, ...fields } = competition
  return {
    ...fields,
    startsOn: localDateFromDb(fields.startsOn),
    endsOn: localDateFromDb(fields.endsOn),
    disciplineSlug: discipline.slug,
    edition: {
      id: eventEdition.id,
      label: `${eventEdition.name} (${eventEdition.year})`,
      startsOn: localDateFromDb(eventEdition.startsOn),
      endsOn: localDateFromDb(eventEdition.endsOn),
      locationLabel: locationLabel(eventEdition.location),
    },
  }
}

/** Active editions a competition can be created under, with their schedule so the form can show what is inherited. */
export async function listEditionOptions() {
  const rows = await prisma.eventEdition.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: "desc" }, { name: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, name: true, year: true, startsOn: true, endsOn: true, location: { select: locationSelect } },
  })
  return rows.map((edition) => ({
    id: edition.id,
    label: `${edition.name} (${edition.year})`,
    startsOn: localDateFromDb(edition.startsOn),
    endsOn: localDateFromDb(edition.endsOn),
    locationLabel: locationLabel(edition.location),
  }))
}

/** Active disciplines (of active sports). The slug tells the form which metadata fields exist. */
export async function listDisciplineOptions() {
  const rows = await prisma.discipline.findMany({
    where: { deletedAt: null, sport: { deletedAt: null } },
    orderBy: [{ sport: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, slug: true, sport: { select: { name: true } } },
  })
  return rows.map((discipline) => ({ id: discipline.id, slug: discipline.slug, label: `${discipline.sport.name} · ${discipline.name}` }))
}

export async function listLocationOptions() {
  const rows = await prisma.location.findMany({
    where: { deletedAt: null },
    orderBy: [{ country: "asc" }, { state: "asc" }, { city: "asc" }, { venueName: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, venueName: true, city: true, state: true, country: true },
  })
  return rows.map((location) => ({
    id: location.id,
    label: [location.venueName, location.city, location.state, location.country].filter(Boolean).join(", "),
  }))
}

/**
 * Active competitions of one edition for the edition screen, ordered like the standalone list.
 * Each item carries what the list shows plus the form-ready values the edit dialog starts from, so the
 * dialog needs no extra request. Dates are `YYYY-MM-DD` strings, as everywhere else.
 */
export async function listEditionCompetitions(eventEditionId: string) {
  if (!competitionIdSchema.safeParse(eventEditionId).success) return []
  const rows = await prisma.competition.findMany({
    where: { eventEditionId, deletedAt: null },
    orderBy: [{ startsOn: { sort: "asc", nulls: "last" } }, { startTime: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }],
    take: 200,
    include: { discipline: { select: { name: true, slug: true } } },
  })
  return rows.map((row) => {
    const metadata = row.metadata as Record<string, unknown> | null
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      participationType: row.participationType,
      disciplineName: row.discipline.name,
      /** Only Trail Running stores a distance today; other disciplines have none to show. */
      distanceKm: typeof metadata?.distanceKm === "number" ? metadata.distanceKm : null,
      startsOn: localDateFromDb(row.startsOn),
      startTime: row.startTime,
      disciplineId: row.disciplineId,
      metadata: row.metadata,
      form: {
        eventEditionId: row.eventEditionId,
        name: row.name,
        slug: row.slug,
        description: row.description ?? "",
        status: row.status,
        participationType: row.participationType,
        startsOn: localDateFromDb(row.startsOn) ?? "",
        endsOn: localDateFromDb(row.endsOn) ?? "",
        startTime: row.startTime ?? "",
        endTime: row.endTime ?? "",
        locationId: row.locationId ?? "",
        registrationUrl: row.registrationUrl ?? "",
      },
    }
  })
}
