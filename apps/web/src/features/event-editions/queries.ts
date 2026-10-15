import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { instantToZonedDateTime, localDateFromDb } from "@/shared/local-date"
import { editionIdentityLabel } from "./rules"
import { EVENT_EDITIONS_PAGE_SIZE, eventEditionIdSchema, eventEditionListParamsSchema } from "./schemas"

type ListFilters = {
  q: string
  year?: number
  status?: Prisma.EventEditionWhereInput["status"]
  publicationStatus?: Prisma.EventEditionWhereInput["publicationStatus"]
  registrationStatus?: Prisma.EventEditionWhereInput["registrationStatus"]
  eventSeriesId?: string
}

export function buildEditionWhere(filters: ListFilters): Prisma.EventEditionWhereInput {
  const where: Prisma.EventEditionWhereInput = { deletedAt: null }
  if (filters.year) where.year = filters.year
  if (filters.status) where.status = filters.status
  if (filters.publicationStatus) where.publicationStatus = filters.publicationStatus
  if (filters.registrationStatus) where.registrationStatus = filters.registrationStatus
  if (filters.eventSeriesId) where.eventSeriesId = filters.eventSeriesId
  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const }
    where.OR = [
      { name: contains },
      { slug: contains },
      { label: contains },
      { eventSeries: { name: contains } },
      { location: { deletedAt: null, OR: [{ venueName: contains }, { city: contains }, { state: contains }] } },
      { organizers: { some: { organizer: { deletedAt: null, name: contains } } } },
    ]
  }
  return where
}

export async function listEventEditions(
  params: { q?: string; page?: number | string; year?: number | string; status?: string; publicationStatus?: string; registrationStatus?: string; eventSeriesId?: string } = {},
) {
  const parsed = eventEditionListParamsSchema.parse({
    q: params.q ?? "",
    page: params.page ?? 1,
    year: params.year || undefined,
    status: params.status || undefined,
    publicationStatus: params.publicationStatus || undefined,
    registrationStatus: params.registrationStatus || undefined,
    eventSeriesId: params.eventSeriesId || undefined,
  })
  const { page: requestedPage, ...filters } = parsed
  const where = buildEditionWhere(filters)
  const total = await prisma.eventEdition.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / EVENT_EDITIONS_PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const rows = await prisma.eventEdition.findMany({
    where,
    // Newest year first; inside a year, later dates first with TBA editions on top (they are the
    // ones that still need attention). Name and id make the order total, so pages never overlap.
    orderBy: [{ year: "desc" }, { startsOn: { sort: "desc", nulls: "first" } }, { name: "asc" }, { id: "asc" }],
    skip: (page - 1) * EVENT_EDITIONS_PAGE_SIZE,
    take: EVENT_EDITIONS_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      label: true,
      slug: true,
      year: true,
      startsOn: true,
      endsOn: true,
      status: true,
      publicationStatus: true,
      registrationStatus: true,
      eventSeries: { select: { name: true } },
      location: { select: { venueName: true, city: true, deletedAt: true } },
      organizers: {
        where: { organizer: { deletedAt: null } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: { role: true, organizer: { select: { name: true } } },
      },
    },
  })
  const items = rows.map(({ organizers, startsOn, endsOn, eventSeries, location, ...edition }) => ({
    ...edition,
    startsOn: localDateFromDb(startsOn),
    endsOn: localDateFromDb(endsOn),
    seriesName: eventSeries.name,
    locationLabel: location && !location.deletedAt ? [location.venueName, location.city].filter(Boolean).join(", ") || null : null,
    primaryOrganizer: organizers.find((o) => o.role === "PRIMARY")?.organizer.name ?? null,
    coOrganizerCount: organizers.filter((o) => o.role === "CO_ORGANIZER").length,
  }))
  return { items, total, page, pageCount, pageSize: EVENT_EDITIONS_PAGE_SIZE, ...filters }
}

/** One edition shaped for the edit form: dates as strings, registration instants in the edition's own time zone. */
export async function getEventEdition(id: string) {
  if (!eventEditionIdSchema.safeParse(id).success) return null
  const edition = await prisma.eventEdition.findFirst({
    where: { id, deletedAt: null },
    include: {
      eventSeries: { select: { id: true, name: true } },
      organizers: { where: { organizer: { deletedAt: null } }, select: { organizerId: true, role: true } },
    },
  })
  if (!edition) return null
  const { organizers, eventSeries, ...fields } = edition
  return {
    ...fields,
    metadata: undefined, // not part of the form; never rewritten by the update action
    seriesName: eventSeries.name,
    startsOn: localDateFromDb(fields.startsOn),
    endsOn: localDateFromDb(fields.endsOn),
    rescheduledFromOn: localDateFromDb(fields.rescheduledFromOn),
    registrationOpenAt: instantToZonedDateTime(fields.registrationOpenAt, fields.timeZone),
    registrationCloseAt: instantToZonedDateTime(fields.registrationCloseAt, fields.timeZone),
    primaryOrganizerId: organizers.find((o) => o.role === "PRIMARY")?.organizerId ?? "",
    coOrganizerIds: organizers.filter((o) => o.role === "CO_ORGANIZER").map((o) => o.organizerId),
  }
}

/**
 * Series offered when creating an edition, each with its organizer template so the form can
 * pre-fill the assignments. The server still copies/validates assignments itself on create.
 */
export async function listSeriesOptions() {
  const rows = await prisma.eventSeries.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      status: true,
      organizers: {
        where: { organizer: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        select: { organizerId: true, role: true },
      },
    },
  })
  return rows.map((series) => ({
    id: series.id,
    label: series.status === "ACTIVE" ? series.name : `${series.name} (${series.status.toLowerCase()})`,
    primaryOrganizerId: series.organizers.find((o) => o.role === "PRIMARY")?.organizerId ?? "",
    coOrganizerIds: series.organizers.filter((o) => o.role === "CO_ORGANIZER").map((o) => o.organizerId),
  }))
}

/** Series for the list filter. */
export function listSeriesFilterOptions() {
  return prisma.eventSeries.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, name: true },
  })
}

export async function listLocationOptions() {
  const rows = await prisma.location.findMany({
    where: { deletedAt: null },
    orderBy: [{ country: "asc" }, { state: "asc" }, { city: "asc" }, { venueName: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, venueName: true, city: true, state: true, country: true },
  })
  return rows.map((l) => ({ id: l.id, label: [l.venueName, l.city, l.state, l.country].filter(Boolean).join(", ") }))
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

/** Slug owner including soft-deleted rows (slugs stay reserved). */
export function findSlugOwner(slug: string) {
  return prisma.eventEdition.findUnique({ where: { slug }, select: { id: true, deletedAt: true } })
}

/**
 * Another non-deleted edition of the same series and year with the same label (or both unlabeled).
 * Several editions per year are allowed, but they must be distinguishable. Not enforced by the
 * database: the actions run this check while holding the series row lock.
 */
export async function findIndistinguishableEdition(
  identity: { eventSeriesId: string; year: number; label: string | null },
  excludeId?: string,
  client: Pick<typeof prisma, "eventEdition"> = prisma,
) {
  const sameYear = await client.eventEdition.findMany({
    where: {
      deletedAt: null,
      eventSeriesId: identity.eventSeriesId,
      year: identity.year,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, label: true },
  })
  const wanted = editionIdentityLabel(identity.label)
  return sameYear.find((edition) => editionIdentityLabel(edition.label) === wanted) ?? null
}
