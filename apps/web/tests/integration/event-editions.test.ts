import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { cleanupFixtures, createOrganizer, createProvider, createTestClient, P } from "./helpers"

let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { createEventEdition, updateEventEdition, deleteEventEdition } = await import("@/features/event-editions/actions")
const { listEventEditions, getEventEdition } = await import("@/features/event-editions/queries")
const { updateEventSeries } = await import("@/features/event-series/actions")
const { deleteOrganizer } = await import("@/features/organizers/actions")
const { deleteLocation } = await import("@/features/locations/actions")

const PASSWORD = "correct-horse-battery"
const KEY = "ee-"
let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers
let disciplineId: string
let seriesId: string
let otherSeriesId: string
let orgA: string
let orgB: string
let orgC: string
let orgD: string
let locationId: string
let otherLocationId: string

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

/** Input for a valid edition of `seriesId`; the slug is explicit so tests control collisions. */
const valid = (key: string, extra: Record<string, unknown> = {}) => ({
  eventSeriesId: seriesId,
  name: `${P}${KEY}${key}`,
  slug: `${P}${KEY}${key}`,
  year: 2030,
  primaryOrganizerId: orgA,
  coOrganizerIds: [],
  ...extra,
})

/** Same as `valid` but without organizers, so the server copies the series template. */
const validInheritingOrganizers = (key: string, extra: Record<string, unknown> = {}) => {
  const { primaryOrganizerId, ...rest } = valid(key, extra)
  void primaryOrganizerId
  return rest
}

async function create(key: string, extra: Record<string, unknown> = {}) {
  const result = await createEventEdition(valid(key, extra))
  if (!result.ok) throw new Error(`fixture failed: ${JSON.stringify(result.error)}`)
  return result.data.id
}

/** Update input equal to the stored edition, so tests only state what they change. */
async function updateInput(id: string, extra: Record<string, unknown> = {}) {
  const edition = await getEventEdition(id)
  if (!edition) throw new Error("missing edition")
  return {
    name: edition.name,
    slug: edition.slug,
    label: edition.label ?? "",
    year: edition.year,
    startsOn: edition.startsOn ?? "",
    endsOn: edition.endsOn ?? "",
    startTime: edition.startTime ?? "",
    endTime: edition.endTime ?? "",
    timeZone: edition.timeZone,
    rescheduledFromOn: edition.rescheduledFromOn ?? "",
    registrationOpenAt: edition.registrationOpenAt ?? "",
    registrationCloseAt: edition.registrationCloseAt ?? "",
    registrationStatus: edition.registrationStatus,
    registrationUrl: edition.registrationUrl ?? "",
    resultsUrl: edition.resultsUrl ?? "",
    publicationStatus: edition.publicationStatus,
    status: edition.status,
    locationId: edition.locationId ?? "",
    primaryOrganizerId: edition.primaryOrganizerId,
    coOrganizerIds: edition.coOrganizerIds,
    ...extra,
  }
}

const assignments = async (id: string) =>
  (await db.eventEditionOrganizer.findMany({ where: { eventEditionId: id } })).map((a) => `${a.organizerId}:${a.role}`).sort()
const templateOf = async (id: string) =>
  (await db.eventSeriesOrganizer.findMany({ where: { eventSeriesId: id } })).map((a) => `${a.organizerId}:${a.role}`).sort()
const sorted = (...values: string[]) => values.sort()
const fieldErrorKeys = (r: { ok: boolean; error?: { fieldErrors?: Record<string, string[]> } }) => Object.keys(r.error?.fieldErrors ?? {}).sort()

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await createUserWithPassword({ email: `${P}ee-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}ee-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("ee-admin")
  userHeaders = await signIn("ee-user")
  const sport = await db.sport.create({ data: { name: `${P}ee-sport`, slug: `${P}ee-sport` } })
  disciplineId = (await db.discipline.create({ data: { name: `${P}ee-disc`, slug: `${P}ee-disc`, sportId: sport.id } })).id
  orgA = (await createOrganizer(db, "ee-a")).id
  orgB = (await createOrganizer(db, "ee-b")).id
  orgC = (await createOrganizer(db, "ee-c")).id
  orgD = (await createOrganizer(db, "ee-d")).id
  seriesId = (await db.eventSeries.create({ data: { name: `${P}ee-series`, slug: `${P}ee-series`, disciplineId } })).id
  otherSeriesId = (await db.eventSeries.create({ data: { name: `${P}ee-other-series`, slug: `${P}ee-other-series`, disciplineId } })).id
  locationId = (await db.location.create({ data: { country: "Venezuela", city: `${P}Caracas`, venueName: `${P}Parque`, slug: `${P}ee-loc` } })).id
  otherLocationId = (await db.location.create({ data: { country: "Venezuela", city: `${P}Valencia`, slug: `${P}ee-loc2` } })).id
})

beforeEach(async () => {
  currentHeaders = adminHeaders
  const mine = { slug: { startsWith: `${P}${KEY}` } }
  await db.eventResource.deleteMany({ where: { eventEdition: mine } })
  await db.eventServiceProvider.deleteMany({ where: { eventEdition: mine } })
  await db.competition.deleteMany({ where: { eventEdition: mine } })
  await db.eventEditionOrganizer.deleteMany({ where: { eventEdition: mine } })
  await db.eventEdition.deleteMany({ where: mine })
  // Series templates: orgA primary, orgB co-organizer (the other series has none).
  await db.eventSeriesOrganizer.deleteMany({ where: { eventSeriesId: { in: [seriesId, otherSeriesId] } } })
  await db.eventSeriesOrganizer.createMany({
    data: [
      { eventSeriesId: seriesId, organizerId: orgA, role: "PRIMARY" },
      { eventSeriesId: seriesId, organizerId: orgB, role: "CO_ORGANIZER" },
    ],
  })
  await db.organizer.updateMany({ where: { id: { in: [orgA, orgB, orgC, orgD] } }, data: { deletedAt: null } })
  await db.location.updateMany({ where: { slug: { startsWith: `${P}ee-loc` } }, data: { deletedAt: null } })
  await db.eventSeries.updateMany({ where: { id: { in: [seriesId, otherSeriesId] } }, data: { deletedAt: null } })
})

afterAll(async () => {
  if (!db) return
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("authorization", () => {
  it("rejects unauthenticated and non-admin callers without touching data", async () => {
    const id = await create("auth", { coOrganizerIds: [orgB] })
    for (const [headers, code] of [[new Headers(), "unauthorized"], [userHeaders, "forbidden"]] as const) {
      currentHeaders = headers
      for (const result of [
        await createEventEdition(valid("auth-new")),
        await updateEventEdition(id, await updateInput(id, { name: "Changed" })),
        await deleteEventEdition(id),
      ]) {
        expect(result).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.eventEdition.count({ where: { slug: `${P}${KEY}auth-new` } })).toBe(0)
    const row = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(row.deletedAt).toBeNull()
    expect(row.name).toBe(`${P}${KEY}auth`)
  })
})

describe("create", () => {
  it("creates a confirmed multi-day edition with times, location, URLs and statuses", async () => {
    const id = await create("full", {
      label: "Primavera",
      startsOn: "2030-05-31",
      endsOn: "2030-06-02",
      startTime: "05:30",
      endTime: "11:00",
      locationId,
      registrationStatus: "OPEN",
      registrationUrl: "https://register.example.test/e",
      resultsUrl: "https://results.example.test/e",
      publicationStatus: "PUBLISHED",
      registrationOpenAt: "2030-03-01T08:00",
      registrationCloseAt: "2030-05-20T23:59",
    })
    const edition = await getEventEdition(id)
    expect(edition).toMatchObject({
      eventSeriesId: seriesId,
      label: "Primavera",
      year: 2030,
      startsOn: "2030-05-31",
      endsOn: "2030-06-02",
      startTime: "05:30",
      endTime: "11:00",
      timeZone: "America/Caracas",
      locationId,
      registrationStatus: "OPEN",
      publicationStatus: "PUBLISHED",
      status: "SCHEDULED",
      registrationOpenAt: "2030-03-01T08:00",
      registrationCloseAt: "2030-05-20T23:59",
    })
    // Stored as the instant of the Caracas wall clock (UTC-4), not as the server's local time.
    const row = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(row.registrationOpenAt?.toISOString()).toBe("2030-03-01T12:00:00.000Z")
    expect(row.startsOn?.toISOString()).toBe("2030-05-31T00:00:00.000Z")
  })

  it("creates a TBA edition with no dates, times or location", async () => {
    const id = await create("tba", { publicationStatus: "PUBLISHED" })
    const row = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(row).toMatchObject({ startsOn: null, endsOn: null, startTime: null, endTime: null, locationId: null, publicationStatus: "PUBLISHED" })
  })

  it("supports a postponed edition that remembers its original date", async () => {
    const id = await create("postponed", { status: "POSTPONED", rescheduledFromOn: "2030-03-01", startsOn: "2030-09-15" })
    expect(await getEventEdition(id)).toMatchObject({ status: "POSTPONED", rescheduledFromOn: "2030-03-01", startsOn: "2030-09-15" })
  })

  it("returns field errors for invalid input and creates nothing", async () => {
    const result = await createEventEdition({ eventSeriesId: "x", name: "", year: "abc", primaryOrganizerId: "", startsOn: "2030-02-30" })
    expect(result).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(fieldErrorKeys(result)).toEqual(["eventSeriesId", "name", "primaryOrganizerId", "startsOn", "year"])
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}` } } })).toBe(0)
  })

  it("rejects date, time and status rule violations", async () => {
    expect(await createEventEdition(valid("d1", { startsOn: "2030-05-02", endsOn: "2030-05-01" }))).toMatchObject({ ok: false, error: { fieldErrors: { endsOn: expect.any(Array) } } })
    expect(await createEventEdition(valid("d2", { endsOn: "2030-05-02" }))).toMatchObject({ ok: false, error: { fieldErrors: { endsOn: expect.any(Array) } } })
    expect(await createEventEdition(valid("d3", { startTime: "07:00" }))).toMatchObject({ ok: false, error: { fieldErrors: { startTime: expect.any(Array) } } })
    expect(await createEventEdition(valid("d4", { startsOn: "2030-05-01", startTime: "10:00", endTime: "09:00" }))).toMatchObject({ ok: false, error: { fieldErrors: { endTime: expect.any(Array) } } })
    expect(await createEventEdition(valid("d6", { status: "COMPLETED" }))).toMatchObject({ ok: false, error: { fieldErrors: { status: expect.any(Array) } } })
    expect(await createEventEdition(valid("d7", { registrationOpenAt: "2030-05-02T10:00", registrationCloseAt: "2030-05-01T10:00" }))).toMatchObject({ ok: false, error: { fieldErrors: { registrationCloseAt: expect.any(Array) } } })
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}d` } } })).toBe(0)
  })

  it("publishes an edition with open registration and no registration URL (WhatsApp, phone, in person…)", async () => {
    const id = await create("no-url", { publicationStatus: "PUBLISHED", registrationStatus: "OPEN" })
    expect(await db.eventEdition.findUniqueOrThrow({ where: { id } })).toMatchObject({
      publicationStatus: "PUBLISHED",
      registrationStatus: "OPEN",
      registrationUrl: null,
    })
  })

  it("keeps publication, event status and registration status independent", async () => {
    const id = await create("independent", {
      publicationStatus: "DRAFT",
      status: "CANCELLED",
      registrationStatus: "SOLD_OUT",
    })
    expect(await db.eventEdition.findUniqueOrThrow({ where: { id } })).toMatchObject({
      publicationStatus: "DRAFT",
      status: "CANCELLED",
      registrationStatus: "SOLD_OUT",
    })
  })

  it("rejects an unknown or deleted series", async () => {
    expect(await createEventEdition(valid("noseries", { eventSeriesId: "99999999-9999-4999-8999-999999999999" }))).toMatchObject({ ok: false, error: { fieldErrors: { eventSeriesId: expect.any(Array) } } })
    await db.eventSeries.update({ where: { id: seriesId }, data: { deletedAt: new Date() } })
    expect(await createEventEdition(valid("delseries"))).toMatchObject({ ok: false, error: { fieldErrors: { eventSeriesId: expect.any(Array) } } })
  })

  it("rejects unknown and deleted locations", async () => {
    expect(await createEventEdition(valid("loc1", { locationId: "99999999-9999-4999-8999-999999999999" }))).toMatchObject({ ok: false, error: { fieldErrors: { locationId: expect.any(Array) } } })
    await db.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } })
    expect(await createEventEdition(valid("loc2", { locationId }))).toMatchObject({ ok: false, error: { fieldErrors: { locationId: expect.any(Array) } } })
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}loc` } } })).toBe(0)
  })

  it("does not create or modify locations", async () => {
    const before = await db.location.findUniqueOrThrow({ where: { id: locationId } })
    const count = await db.location.count()
    await create("loc-untouched", { locationId })
    expect(await db.location.count()).toBe(count)
    expect(await db.location.findUniqueOrThrow({ where: { id: locationId } })).toEqual(before)
  })
})

describe("several editions of one series in the same year", () => {
  it("creates distinguishable editions with different derived slugs", async () => {
    const spring = await createEventEdition({ ...valid("x"), slug: "", name: `${P}${KEY}Maraton`, label: "Primavera" })
    const autumn = await createEventEdition({ ...valid("x"), slug: "", name: `${P}${KEY}Maraton`, label: "Otoño" })
    expect(spring.ok && autumn.ok).toBe(true)
    const slugs = (await db.eventEdition.findMany({ where: { eventSeriesId: seriesId, year: 2030 }, select: { slug: true } })).map((e) => e.slug).sort()
    expect(slugs).toEqual([`${P}${KEY}maraton-otono-2030`, `${P}${KEY}maraton-primavera-2030`])
  })

  it("rejects a second unlabeled edition and a repeated label, case-insensitively", async () => {
    await create("one")
    expect(await createEventEdition(valid("two"))).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { label: expect.any(Array) } } })
    await create("three", { label: "Spring" })
    expect(await createEventEdition(valid("four", { label: " spring " }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await db.eventEdition.count({ where: { slug: { in: [`${P}${KEY}two`, `${P}${KEY}four`] } } })).toBe(0)
  })

  it("allows the same label in another year or another series", async () => {
    await create("y1", { label: "Spring" })
    expect((await createEventEdition(valid("y2", { label: "Spring", year: 2031 }))).ok).toBe(true)
    expect((await createEventEdition(valid("y3", { label: "Spring", eventSeriesId: otherSeriesId }))).ok).toBe(true)
  })

  it("lets a deleted edition's identity be reused but keeps its slug reserved", async () => {
    const id = await create("old", { label: "Spring" })
    expect((await deleteEventEdition(id)).ok).toBe(true)
    expect(await createEventEdition(valid("new", { label: "Spring" }))).toMatchObject({ ok: true })
    expect(await createEventEdition(valid("old", { label: "Fall" }))).toMatchObject({
      ok: false,
      error: { code: "conflict", fieldErrors: { slug: ["Reserved by a deleted edition."] } },
    })
  })
})

describe("slug conflicts", () => {
  it("reports a slug already in use and never appends a suffix", async () => {
    await create("taken")
    const result = await createEventEdition(valid("other", { slug: `${P}${KEY}taken`, label: "Other" }))
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: ["Already in use."] } } })
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}taken` } } })).toBe(1)
  })

  it("reports a conflict on the derived slug instead of generating another one", async () => {
    await create("derived", { slug: `${P}${KEY}derived-2030`, name: `${P}${KEY}derived` })
    const result = await createEventEdition({ ...valid("derived"), slug: "", name: `${P}${KEY}derived`, eventSeriesId: otherSeriesId })
    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } })
  })

  it("lets an edition keep its own slug on update", async () => {
    const id = await create("own")
    expect((await updateEventEdition(id, await updateInput(id, { name: "Renamed" }))).ok).toBe(true)
  })

  it("rejects moving an edition onto another edition's slug", async () => {
    await create("a1")
    const id = await create("a2", { label: "II" })
    expect(await updateEventEdition(id, await updateInput(id, { slug: `${P}${KEY}a1` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
  })

  it("maps a lost race on the unique slug to a conflict and rolls the whole create back", async () => {
    const slug = `${P}${KEY}race`
    const rival = await holdUncommittedEdition(slug)
    const pending = createEventEdition(valid("race", { slug, coOrganizerIds: [orgB] }))
    await rival.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
    const rows = await db.eventEdition.findMany({ where: { slug } })
    expect(rows).toHaveLength(1) // only the rival's row
    expect(await db.eventEditionOrganizer.count({ where: { eventEditionId: rows[0].id } })).toBe(0)
  })

  it("rolls back organizer changes when the final write loses a slug race", async () => {
    const id = await create("rollback", { coOrganizerIds: [orgB] })
    const slug = `${P}${KEY}rollback-new`
    const before = await assignments(id)
    const rival = await holdUncommittedEdition(slug)
    const pending = updateEventEdition(id, await updateInput(id, { slug, primaryOrganizerId: orgC, coOrganizerIds: [orgD] }))
    await rival.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await assignments(id)).toEqual(before)
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id } })).slug).toBe(`${P}${KEY}rollback`)
  })

  it("lets exactly one of two concurrent creations with the same slug win", async () => {
    const slug = `${P}${KEY}concurrent`
    const results = await Promise.all([
      createEventEdition(valid("c1", { slug, eventSeriesId: seriesId })),
      createEventEdition(valid("c2", { slug, eventSeriesId: otherSeriesId, primaryOrganizerId: orgC })),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)[0]).toMatchObject({ error: { code: "conflict" } })
    expect(await db.eventEdition.count({ where: { slug } })).toBe(1)
  })
})

/** Opens a second transaction that inserted an edition with `slug` but has not committed yet. */
async function holdUncommittedEdition(slug: string) {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  let inserted!: () => void
  const insertedSignal = new Promise<void>((resolve) => (inserted = resolve))
  const transaction = db.$transaction(
    async (tx) => {
      await tx.eventEdition.create({ data: { eventSeriesId: otherSeriesId, year: 2040, name: `${P}${KEY}rival`, slug } })
      inserted()
      await gate
    },
    { timeout: 20_000 },
  )
  await insertedSignal
  return {
    // Give the competing action time to reach the blocked unique-index write before committing.
    async commit() {
      await new Promise((resolve) => setTimeout(resolve, 500))
      release()
      await transaction
    },
  }
}

describe("organizer inheritance", () => {
  it("copies the series template (primary and co-organizers) when none is given", async () => {
    const withoutOrganizers = validInheritingOrganizers("inherit")
    const result = await createEventEdition(withoutOrganizers)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(await assignments(result.data.id)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
  })

  it("skips template organizers that were deleted, keeping the roles of the rest", async () => {
    await db.organizer.update({ where: { id: orgB }, data: { deletedAt: new Date() } })
    const withoutOrganizers = validInheritingOrganizers("inherit-del")
    const result = await createEventEdition(withoutOrganizers)
    expect(result.ok && (await assignments(result.data.id))).toEqual([`${orgA}:PRIMARY`])
  })

  it("asks for a primary when the template has none that is active", async () => {
    await db.organizer.update({ where: { id: orgA }, data: { deletedAt: new Date() } })
    const withoutOrganizers = validInheritingOrganizers("inherit-noprimary")
    expect(await createEventEdition(withoutOrganizers)).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    const emptyTemplate = validInheritingOrganizers("inherit-empty", { eventSeriesId: otherSeriesId })
    expect(await createEventEdition(emptyTemplate)).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}inherit` } } })).toBe(0)
  })

  it("lets the admin modify the copied assignments before saving, leaving the series untouched", async () => {
    const id = await create("custom", { primaryOrganizerId: orgC, coOrganizerIds: [orgA, orgD] })
    expect(await assignments(id)).toEqual(sorted(`${orgC}:PRIMARY`, `${orgA}:CO_ORGANIZER`, `${orgD}:CO_ORGANIZER`))
    expect(await templateOf(seriesId)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
  })

  it("rejects deleted, unknown and duplicate organizers", async () => {
    await db.organizer.update({ where: { id: orgC }, data: { deletedAt: new Date() } })
    expect(await createEventEdition(valid("o1", { primaryOrganizerId: orgC }))).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    expect(await createEventEdition(valid("o2", { coOrganizerIds: [orgC] }))).toMatchObject({ ok: false, error: { fieldErrors: { coOrganizerIds: expect.any(Array) } } })
    expect(await createEventEdition(valid("o3", { primaryOrganizerId: "99999999-9999-4999-8999-999999999999" }))).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    expect(await createEventEdition(valid("o4", { coOrganizerIds: [orgA] }))).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await createEventEdition(valid("o5", { coOrganizerIds: [orgB, orgB] }))).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await db.eventEdition.count({ where: { slug: { startsWith: `${P}${KEY}o` } } })).toBe(0)
  })
})

describe("independent edition organizers", () => {
  it("does not change existing editions when the series organizers change", async () => {
    const id = await create("indep-1", { coOrganizerIds: [orgB] })
    const seriesUpdate = await updateEventSeries(seriesId, {
      name: `${P}ee-series`,
      slug: `${P}ee-series`,
      disciplineId,
      primaryOrganizerId: orgC,
      coOrganizerIds: [orgD],
    })
    expect(seriesUpdate.ok).toBe(true)
    expect(await templateOf(seriesId)).toEqual(sorted(`${orgC}:PRIMARY`, `${orgD}:CO_ORGANIZER`))
    expect(await assignments(id)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
    // A new edition copies the *new* template.
    const withoutOrganizers = validInheritingOrganizers("indep-2", { label: "II" })
    const second = await createEventEdition(withoutOrganizers)
    expect(second.ok && (await assignments(second.data.id))).toEqual(sorted(`${orgC}:PRIMARY`, `${orgD}:CO_ORGANIZER`))
  })

  it("does not change the series organizers when the edition organizers change", async () => {
    const id = await create("indep-3", { coOrganizerIds: [orgB] })
    const result = await updateEventEdition(id, await updateInput(id, { primaryOrganizerId: orgC, coOrganizerIds: [orgD] }))
    expect(result.ok).toBe(true)
    expect(await assignments(id)).toEqual(sorted(`${orgC}:PRIMARY`, `${orgD}:CO_ORGANIZER`))
    expect(await templateOf(seriesId)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
  })

  it("swaps the PRIMARY with a co-organizer and keeps exactly one PRIMARY", async () => {
    const id = await create("swap", { coOrganizerIds: [orgB] })
    const before = await db.eventEditionOrganizer.findMany({ where: { eventEditionId: id } })
    const result = await updateEventEdition(id, await updateInput(id, { primaryOrganizerId: orgB, coOrganizerIds: [orgA] }))
    expect(result.ok).toBe(true)
    expect(await assignments(id)).toEqual(sorted(`${orgB}:PRIMARY`, `${orgA}:CO_ORGANIZER`))
    // Rows were updated in place, not recreated.
    const after = await db.eventEditionOrganizer.findMany({ where: { eventEditionId: id } })
    expect(after.map((a) => a.id).sort()).toEqual(before.map((a) => a.id).sort())
  })

  it("replaces the PRIMARY with an outside organizer, removing the old one", async () => {
    const id = await create("replace", { coOrganizerIds: [orgB] })
    expect((await updateEventEdition(id, await updateInput(id, { primaryOrganizerId: orgC, coOrganizerIds: [orgB] }))).ok).toBe(true)
    expect(await assignments(id)).toEqual(sorted(`${orgC}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
  })

  it("demotes the old PRIMARY to co-organizer when a new primary is promoted", async () => {
    const id = await create("demote")
    expect((await updateEventEdition(id, await updateInput(id, { primaryOrganizerId: orgC, coOrganizerIds: [orgA] }))).ok).toBe(true)
    expect(await assignments(id)).toEqual(sorted(`${orgC}:PRIMARY`, `${orgA}:CO_ORGANIZER`))
  })

  it("adds and removes co-organizers and keeps untouched rows", async () => {
    const id = await create("co", { coOrganizerIds: [orgB] })
    const primaryRow = await db.eventEditionOrganizer.findFirstOrThrow({ where: { eventEditionId: id, role: "PRIMARY" } })
    expect((await updateEventEdition(id, await updateInput(id, { coOrganizerIds: [orgC, orgD] }))).ok).toBe(true)
    expect(await assignments(id)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgC}:CO_ORGANIZER`, `${orgD}:CO_ORGANIZER`))
    expect(await db.eventEditionOrganizer.findUniqueOrThrow({ where: { id: primaryRow.id } })).toEqual(primaryRow)
  })

  it("rejects deleted organizers on update and leaves everything unchanged", async () => {
    const id = await create("upd-del", { coOrganizerIds: [orgB] })
    const before = await assignments(id)
    await db.organizer.update({ where: { id: orgC }, data: { deletedAt: new Date() } })
    const result = await updateEventEdition(id, await updateInput(id, { name: "Changed", primaryOrganizerId: orgC }))
    expect(result).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    expect(await assignments(id)).toEqual(before)
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id } })).name).toBe(`${P}${KEY}upd-del`)
  })

  it("blocks deleting an organizer assigned to an active edition", async () => {
    await create("org-block")
    expect(await deleteOrganizer(orgA)).toMatchObject({ ok: false, error: { code: "conflict" } })
  })
})

describe("update", () => {
  it("updates fields, keeps the series, id, metadata and creation time", async () => {
    const id = await create("upd", { label: "Spring", startsOn: "2030-05-01" })
    await db.eventEdition.update({ where: { id }, data: { metadata: { sponsors: ["Acme"] } } })
    const before = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    const result = await updateEventEdition(id, {
      ...(await updateInput(id, { name: "New name", endsOn: "2030-05-03", locationId, status: "SCHEDULED" })),
      eventSeriesId: otherSeriesId, // not accepted on update
    })
    expect(result).toEqual({ ok: true, data: { id } })
    const after = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(after).toMatchObject({ name: "New name", locationId, eventSeriesId: seriesId, createdAt: before.createdAt, slug: before.slug })
    expect(after.metadata).toEqual({ sponsors: ["Acme"] })
    expect(after.endsOn?.toISOString()).toBe("2030-05-03T00:00:00.000Z")
  })

  it("keeps other relationships: competitions, resources and providers survive an edit", async () => {
    const id = await create("rel", { startsOn: "2030-05-01" })
    const competition = await db.competition.create({ data: { eventEditionId: id, disciplineId, name: `${P}ee-comp`, slug: `${P}${KEY}comp` } })
    await db.eventResource.create({ data: { eventEditionId: id, title: "Photos", type: "PHOTO_GALLERY", provider: "GOOGLE_DRIVE", url: "https://photos.example.test/a" } })
    expect((await updateEventEdition(id, await updateInput(id, { name: "Edited" }))).ok).toBe(true)
    expect(await db.competition.findUnique({ where: { id: competition.id } })).not.toBeNull()
    expect(await db.eventResource.count({ where: { eventEditionId: id } })).toBe(1)
  })

  it("can clear dates and location back to TBA", async () => {
    const id = await create("clear", { startsOn: "2030-05-01", endsOn: "2030-05-02", startTime: "06:00", locationId })
    const result = await updateEventEdition(id, await updateInput(id, { startsOn: "", endsOn: "", startTime: "", endTime: "", locationId: "" }))
    expect(result.ok).toBe(true)
    expect(await db.eventEdition.findUniqueOrThrow({ where: { id } })).toMatchObject({ startsOn: null, endsOn: null, startTime: null, locationId: null })
  })

  it("moves an edition to another time zone without shifting its calendar dates", async () => {
    const id = await create("tz", { startsOn: "2030-05-01", registrationOpenAt: "2030-03-01T08:00" })
    expect((await updateEventEdition(id, await updateInput(id, { timeZone: "America/Bogota", registrationOpenAt: "2030-03-01T08:00" }))).ok).toBe(true)
    const row = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(row.startsOn?.toISOString()).toBe("2030-05-01T00:00:00.000Z")
    expect(row.registrationOpenAt?.toISOString()).toBe("2030-03-01T13:00:00.000Z")
  })

  it("applies the same date and status validation as create", async () => {
    const id = await create("upd-val", { startsOn: "2030-05-01" })
    expect(await updateEventEdition(id, await updateInput(id, { endsOn: "2030-04-01" }))).toMatchObject({ ok: false, error: { fieldErrors: { endsOn: expect.any(Array) } } })
    expect(await updateEventEdition(id, await updateInput(id, { startsOn: "", status: "COMPLETED" }))).toMatchObject({ ok: false, error: { fieldErrors: { status: expect.any(Array) } } })
    expect((await updateEventEdition(id, await updateInput(id, { publicationStatus: "PUBLISHED", registrationStatus: "OPEN" }))).ok).toBe(true)
  })

  it("keeps the edition year and slug when the edition is postponed into the next year", async () => {
    const id = await create("next-year", { year: 2030, startsOn: "2030-11-01", publicationStatus: "PUBLISHED" })
    const before = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    const result = await updateEventEdition(
      id,
      await updateInput(id, { status: "POSTPONED", rescheduledFromOn: "2030-11-01", startsOn: "2031-02-14" }),
    )
    expect(result.ok).toBe(true)
    const after = await db.eventEdition.findUniqueOrThrow({ where: { id } })
    expect(after).toMatchObject({ year: 2030, slug: before.slug, eventSeriesId: seriesId, status: "POSTPONED" })
    expect(after.startsOn?.toISOString()).toBe("2031-02-14T00:00:00.000Z")
    // Another edition of the same series keeps its own identity; the new date never changes it either.
    expect(await listEventEditions({ q: before.slug, year: 2030 })).toMatchObject({ total: 1 })
    expect(await listEventEditions({ q: before.slug, year: 2031 })).toMatchObject({ total: 0 })
  })

  it("postpones a published edition without touching publication or registration", async () => {
    const id = await create("postpone", { startsOn: "2030-05-01", publicationStatus: "PUBLISHED", registrationStatus: "CLOSED" })
    const result = await updateEventEdition(id, await updateInput(id, { status: "POSTPONED", rescheduledFromOn: "2030-05-01", startsOn: "2030-08-01" }))
    expect(result.ok).toBe(true)
    expect(await db.eventEdition.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: "POSTPONED", publicationStatus: "PUBLISHED", registrationStatus: "CLOSED" })
  })

  it("rejects a change that makes the edition indistinguishable from a sibling", async () => {
    await create("sib1", { label: "Spring" })
    const id = await create("sib2", { label: "Fall" })
    expect(await updateEventEdition(id, await updateInput(id, { label: "SPRING" }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await updateEventEdition(id, await updateInput(id, { label: "Fall" }))).ok).toBe(true)
  })

  it("returns not_found for unknown, malformed and deleted editions", async () => {
    const id = await create("gone")
    const input = await updateInput(id)
    await deleteEventEdition(id)
    expect(await updateEventEdition(id, input)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await updateEventEdition("nope", input)).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("rejects new dates that would orphan an existing competition, but only when the dates change", async () => {
    const id = await create("window", { startsOn: "2030-05-01", endsOn: "2030-05-03" })
    await db.competition.create({
      data: { eventEditionId: id, disciplineId, name: `${P}ee-window`, slug: `${P}${KEY}window-comp`, startsOn: new Date("2030-05-03T00:00:00.000Z") },
    })
    expect(await updateEventEdition(id, await updateInput(id, { endsOn: "2030-05-02" }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await updateEventEdition(id, await updateInput(id, { endsOn: "2030-05-05" }))).ok).toBe(true)
    expect((await updateEventEdition(id, await updateInput(id, { name: "Unrelated edit" }))).ok).toBe(true)
  })
})

describe("soft deletion", () => {
  it("marks the edition deleted, hides it, and keeps its organizer assignments", async () => {
    const id = await create("del", { coOrganizerIds: [orgB], locationId })
    expect(await deleteEventEdition(id)).toEqual({ ok: true, data: undefined })
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
    expect(await assignments(id)).toEqual(sorted(`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`))
    expect(await getEventEdition(id)).toBeNull()
    expect((await listEventEditions({ q: `${P}${KEY}del` })).items).toHaveLength(0)
    expect(await deleteEventEdition(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await deleteEventEdition("nope")).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("is blocked by an active competition, service provider or resource, and allowed once each is soft-deleted", async () => {
    const id = await create("blocked")
    const provider = await createProvider(db, "ee-provider")
    const competition = await db.competition.create({ data: { eventEditionId: id, disciplineId, name: `${P}ee-c`, slug: `${P}${KEY}c` } })
    const appearance = await db.eventServiceProvider.create({ data: { eventEditionId: id, providerId: provider.id, role: "PHOTOGRAPHER" } })
    const resource = await db.eventResource.create({ data: { eventEditionId: id, title: "t", type: "OTHER", provider: "GOOGLE_DRIVE", url: "https://r.example.test/1" } })
    expect(await deleteEventEdition(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    await db.competition.update({ where: { id: competition.id }, data: { deletedAt: new Date() } })
    expect(await deleteEventEdition(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await db.eventServiceProvider.update({ where: { id: appearance.id }, data: { deletedAt: new Date() } })
    expect(await deleteEventEdition(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await db.eventResource.update({ where: { id: resource.id }, data: { deletedAt: new Date() } })
    expect((await deleteEventEdition(id)).ok).toBe(true)
    // Historical children stay attached to the deleted edition.
    expect(await db.competition.count({ where: { eventEditionId: id } })).toBe(1)
  })

  it("blocks deleting its location while the edition is active and frees it afterwards", async () => {
    const id = await create("deps", { locationId })
    expect(await deleteLocation(locationId)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await deleteEventEdition(id)
    expect((await deleteLocation(locationId)).ok).toBe(true)
  })
})

describe("listing", () => {
  const seed = async () => {
    await create("l-a", { name: `${P}${KEY}Alpha Run`, label: "Spring", year: 2031, startsOn: "2031-03-01", publicationStatus: "PUBLISHED", locationId })
    await create("l-b", { name: `${P}${KEY}Beta Run`, year: 2031, locationId: otherLocationId, status: "POSTPONED" })
    await create("l-c", { name: `${P}${KEY}Gamma Ride`, year: 2030, startsOn: "2030-07-01", eventSeriesId: otherSeriesId, primaryOrganizerId: orgC, registrationStatus: "SOLD_OUT" })
    await create("l-d", { name: `${P}${KEY}Delta Ride`, year: 2031, startsOn: "2031-09-01", label: "Fall" })
  }
  const slugs = async (params: Parameters<typeof listEventEditions>[0] = {}) =>
    (await listEventEditions({ q: `${P}${KEY}`, ...params })).items.map((e) => e.slug.replace(`${P}${KEY}`, ""))

  it("orders by year (newest first), then date with TBA editions first, then name", async () => {
    await seed()
    expect(await slugs()).toEqual(["l-b", "l-d", "l-a", "l-c"])
  })

  it("searches name, slug, label, series, location and organizer names", async () => {
    await seed()
    expect(await slugs({ q: "alpha" })).toEqual(["l-a"])
    expect(await slugs({ q: `${P}${KEY}l-c` })).toEqual(["l-c"])
    expect(await slugs({ q: "fall" })).toEqual(["l-d"])
    expect(await slugs({ q: `${P}ee-other-series` })).toEqual(["l-c"])
    expect(await slugs({ q: `${P}Valencia` })).toEqual(["l-b"])
    expect(await slugs({ q: `${P}ee-c` })).toEqual(["l-c"])
    expect(await slugs({ q: "no-such-edition" })).toEqual([])
  })

  it("filters by year, statuses and series, alone and combined", async () => {
    await seed()
    expect(await slugs({ year: 2030 })).toEqual(["l-c"])
    expect(await slugs({ status: "POSTPONED" })).toEqual(["l-b"])
    expect(await slugs({ publicationStatus: "PUBLISHED" })).toEqual(["l-a"])
    expect(await slugs({ registrationStatus: "SOLD_OUT" })).toEqual(["l-c"])
    expect(await slugs({ eventSeriesId: otherSeriesId })).toEqual(["l-c"])
    expect(await slugs({ year: 2031, q: "run" })).toEqual(["l-b", "l-a"])
    expect(await slugs({ year: 2031, status: "POSTPONED", publicationStatus: "PUBLISHED" })).toEqual([])
  })

  it("excludes deleted editions and ignores invalid filters", async () => {
    await seed()
    const id = await create("l-e", { name: `${P}${KEY}Echo`, year: 2031 , label: "X" })
    await deleteEventEdition(id)
    expect(await slugs()).not.toContain("l-e")
    expect(await slugs({ status: "NOPE", year: "abc" })).toHaveLength(4)
  })

  it("paginates, clamps out-of-range pages and reports totals", async () => {
    for (let n = 1; n <= 23; n++) {
      await create(`p-${String(n).padStart(2, "0")}`, { name: `${P}${KEY}Page ${String(n).padStart(2, "0")}`, label: `L${n}` })
    }
    const first = await listEventEditions({ q: `${P}${KEY}p-` })
    expect(first).toMatchObject({ total: 23, page: 1, pageCount: 2, pageSize: 20 })
    expect(first.items).toHaveLength(20)
    const second = await listEventEditions({ q: `${P}${KEY}p-`, page: 2 })
    expect(second.items).toHaveLength(3)
    const firstIds = new Set(first.items.map((e) => e.id))
    expect(second.items.some((e) => firstIds.has(e.id))).toBe(false)
    expect((await listEventEditions({ q: `${P}${KEY}p-`, page: 99 })).page).toBe(2)
    expect((await listEventEditions({ q: `${P}${KEY}p-`, page: "-4" })).page).toBe(1)
  })

  it("lists display fields: dates as plain strings, primary organizer and co-organizer count", async () => {
    const id = await create("l-view", { startsOn: "2030-12-31", endsOn: "2031-01-01", year: 2030, coOrganizerIds: [orgB, orgC], locationId })
    const item = (await listEventEditions({ q: `${P}${KEY}l-view` })).items.find((e) => e.id === id)
    expect(item).toMatchObject({ startsOn: "2030-12-31", endsOn: "2031-01-01", primaryOrganizer: `${P}ee-a`, coOrganizerCount: 2, seriesName: `${P}ee-series` })
    expect(item?.locationLabel).toContain(`${P}Parque`)
  })
})
