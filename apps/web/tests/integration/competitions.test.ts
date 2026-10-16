import type { Prisma, PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { localDateToDb } from "@/shared/local-date"
import { cleanupFixtures, createEdition, createTestClient, P } from "./helpers"

let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { createCompetition, updateCompetition, deleteCompetition } = await import("@/features/competitions/actions")
const { listCompetitions, listEditionCompetitions, getCompetition, listEditionOptions, listDisciplineOptions } = await import("@/features/competitions/queries")
const { updateEventEdition, deleteEventEdition } = await import("@/features/event-editions/actions")
const { getEventEdition } = await import("@/features/event-editions/queries")

const PASSWORD = "correct-horse-battery"
const KEY = "cp-"
let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers
let trailDisciplineId: string // has a metadata schema
let roadDisciplineId: string // no metadata schema; also the discipline of the series
let deletedDisciplineId: string
let disciplineOfDeletedSportId: string
let editionId: string // 2030-05-10 → 2030-05-12, at locationA
let otherEditionId: string // 2030-06-01, no location
let tbaEditionId: string // no dates, no location
let locationA: string
let locationB: string

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

/** Input for a valid competition of `editionId` in the road discipline; the slug is explicit so tests control collisions. */
const valid = (key: string, extra: Record<string, unknown> = {}) => ({
  eventEditionId: editionId,
  disciplineId: roadDisciplineId,
  name: `${P}${KEY}${key}`,
  slug: `${P}${KEY}${key}`,
  ...extra,
})

async function create(key: string, extra: Record<string, unknown> = {}) {
  const result = await createCompetition(valid(key, extra))
  if (!result.ok) throw new Error(`fixture failed: ${JSON.stringify(result.error)}`)
  return result.data.id
}

/** Update input equal to the stored competition (metadata untouched), so tests only state what they change. */
async function updateInput(id: string, extra: Record<string, unknown> = {}) {
  const competition = await getCompetition(id)
  if (!competition) throw new Error("missing competition")
  return {
    disciplineId: competition.disciplineId,
    name: competition.name,
    slug: competition.slug,
    description: competition.description ?? "",
    status: competition.status,
    participationType: competition.participationType,
    startsOn: competition.startsOn ?? "",
    endsOn: competition.endsOn ?? "",
    startTime: competition.startTime ?? "",
    endTime: competition.endTime ?? "",
    locationId: competition.locationId ?? "",
    registrationUrl: competition.registrationUrl ?? "",
    ...extra,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const fieldErrorKeys = (r: { ok: boolean; error?: { fieldErrors?: Record<string, string[]> } }) => Object.keys(r.error?.fieldErrors ?? {}).sort()
const storedRow = (id: string) => db.competition.findUniqueOrThrow({ where: { id } })
const randomUuid = "99999999-9999-4999-8999-999999999999"

async function metadataIsSqlNull(id: string) {
  const [row] = await db.$queryRaw<{ is_null: boolean }[]>`SELECT metadata IS NULL AS is_null FROM competitions WHERE id = ${id}::uuid`
  return row.is_null
}

/**
 * Runs `work` inside a second transaction that stays open until `commit()`. Used to stand in for
 * another admin's in-flight write while the action under test is started.
 */
async function holdTransaction(work: (tx: Prisma.TransactionClient) => Promise<void>) {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  let ready!: () => void
  const readySignal = new Promise<void>((resolve) => (ready = resolve))
  const transaction = db.$transaction(
    async (tx) => {
      await work(tx)
      ready()
      await gate
    },
    { timeout: 20_000 },
  )
  await Promise.race([readySignal, transaction])
  return {
    async commit() {
      release()
      await transaction
    },
  }
}

/** True while `pending` is still waiting for a lock after giving it time to run. */
async function staysBlocked(pending: Promise<unknown>) {
  return (await Promise.race([pending.then(() => "finished"), sleep(600).then(() => "blocked")])) === "blocked"
}

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await createUserWithPassword({ email: `${P}cp-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}cp-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("cp-admin")
  userHeaders = await signIn("cp-user")

  const sport = await db.sport.create({ data: { name: `${P}cp-sport`, slug: `${P}cp-sport` } })
  const deletedSport = await db.sport.create({ data: { name: `${P}cp-gone-sport`, slug: `${P}cp-gone-sport`, deletedAt: new Date() } })
  trailDisciplineId = (await db.discipline.create({ data: { name: `${P}cp-trail`, slug: "trail-running", sportId: sport.id } })).id
  roadDisciplineId = (await db.discipline.create({ data: { name: `${P}cp-road`, slug: `${P}cp-road`, sportId: sport.id } })).id
  deletedDisciplineId = (await db.discipline.create({ data: { name: `${P}cp-gone`, slug: `${P}cp-gone`, sportId: sport.id, deletedAt: new Date() } })).id
  disciplineOfDeletedSportId = (await db.discipline.create({ data: { name: `${P}cp-orphan`, slug: `${P}cp-orphan`, sportId: deletedSport.id } })).id

  locationA = (await db.location.create({ data: { country: "Venezuela", city: `${P}Caracas`, venueName: `${P}Parque`, slug: `${P}cp-loc-a` } })).id
  locationB = (await db.location.create({ data: { country: "Venezuela", city: `${P}Valencia`, slug: `${P}cp-loc-b` } })).id
  const series = await db.eventSeries.create({ data: { name: `${P}cp-series`, slug: `${P}cp-series`, disciplineId: roadDisciplineId } })
  editionId = (await createEdition(db, series.id, "cp-ed", { startsOn: localDateToDb("2030-05-10"), endsOn: localDateToDb("2030-05-12"), locationId: locationA })).id
  otherEditionId = (await createEdition(db, series.id, "cp-ed-other", { year: 2031, startsOn: localDateToDb("2030-06-01") })).id
  tbaEditionId = (await createEdition(db, series.id, "cp-ed-tba", { year: 2032 })).id
})

beforeEach(async () => {
  currentHeaders = adminHeaders
  await db.result.deleteMany({ where: { competition: { slug: { startsWith: `${P}${KEY}` } } } })
  await db.athlete.deleteMany({ where: { fullName: { startsWith: `${P}${KEY}` } } })
  await db.competition.deleteMany({ where: { slug: { startsWith: `${P}${KEY}` } } })
  await db.eventEdition.updateMany({
    where: { slug: { startsWith: `${P}${KEY}ed` } },
    data: { deletedAt: null },
  })
  await db.eventEdition.update({
    where: { id: editionId },
    data: { startsOn: localDateToDb("2030-05-10"), endsOn: localDateToDb("2030-05-12"), locationId: locationA },
  })
  await db.location.updateMany({ where: { slug: { startsWith: `${P}${KEY}loc` } }, data: { deletedAt: null } })
})

afterAll(async () => {
  if (!db) return
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("authorization", () => {
  it("rejects unauthenticated and non-admin callers without touching data", async () => {
    const id = await create("auth")
    for (const [headers, code] of [[new Headers(), "unauthorized"], [userHeaders, "forbidden"]] as const) {
      currentHeaders = headers
      for (const result of [
        await createCompetition(valid("auth-new")),
        await updateCompetition(id, await updateInput(id, { name: "Changed" })),
        await deleteCompetition(id),
      ]) {
        expect(result).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.competition.count({ where: { slug: `${P}${KEY}auth-new` } })).toBe(0)
    const row = await storedRow(id)
    expect(row.deletedAt).toBeNull()
    expect(row.name).toBe(`${P}${KEY}auth`)
  })
})

describe("create", () => {
  it("creates a minimal competition that inherits the edition's dates and location", async () => {
    const id = await create("minimal")
    const row = await storedRow(id)
    expect(row).toMatchObject({ eventEditionId: editionId, startsOn: null, endsOn: null, startTime: null, endTime: null, locationId: null })
    expect(row.status).toBe("ACTIVE")
    expect(row.participationType).toBe("COMPETITIVE")
    const { items } = await listCompetitions({ eventEditionId: editionId })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      effectiveStartsOn: "2030-05-10",
      effectiveEndsOn: "2030-05-10", // a competition never spans the edition implicitly
      datesInherited: true,
      locationInherited: true,
      locationLabel: `${P}Parque, ${P}Caracas`,
    })
  })

  it("creates a competition with its own dates, times, location and registration URL", async () => {
    const id = await create("full", {
      startsOn: "2030-05-11",
      endsOn: "2030-05-12",
      startTime: "06:30",
      endTime: "13:00",
      locationId: locationB,
      registrationUrl: "https://register.example.test/c",
      description: "  Long   course ",
      status: "COMPLETED",
    })
    expect(await getCompetition(id)).toMatchObject({
      startsOn: "2030-05-11",
      endsOn: "2030-05-12",
      startTime: "06:30",
      endTime: "13:00",
      locationId: locationB,
      registrationUrl: "https://register.example.test/c",
      description: "Long course",
      status: "COMPLETED",
    })
    const { items } = await listCompetitions({ eventEditionId: editionId })
    expect(items[0]).toMatchObject({ datesInherited: false, locationInherited: false, locationLabel: `${P}Valencia` })
  })

  it("stores date-only values without a timezone shift", async () => {
    const id = await create("dates", { startsOn: "2030-05-12", endsOn: "2030-05-12" })
    expect((await storedRow(id)).startsOn?.toISOString()).toBe("2030-05-12T00:00:00.000Z")
    expect((await getCompetition(id))?.startsOn).toBe("2030-05-12")
  })

  it("supports competitive and recreational participation", async () => {
    const competitive = await create("competitive", { participationType: "COMPETITIVE" })
    const recreational = await create("recreational", { participationType: "RECREATIONAL" })
    expect((await storedRow(competitive)).participationType).toBe("COMPETITIVE")
    expect((await storedRow(recreational)).participationType).toBe("RECREATIONAL")
    expect(await db.result.count({ where: { competitionId: recreational } })).toBe(0)
  })

  it.each(["ACTIVE", "CANCELLED", "COMPLETED"])("stores the %s status", async (status) => {
    const id = await create(`status-${status.toLowerCase()}`, { status })
    expect((await storedRow(id)).status).toBe(status)
  })

  it("allows a discipline different from the discipline of the series", async () => {
    const series = await db.eventSeries.findFirstOrThrow({ where: { slug: `${P}cp-series` } })
    expect(series.disciplineId).toBe(roadDisciplineId)
    const id = await create("trail", { disciplineId: trailDisciplineId })
    expect((await storedRow(id)).disciplineId).toBe(trailDisciplineId)
  })

  it("derives the slug from the name when none is given", async () => {
    const result = await createCompetition(valid("derived", { slug: "", name: `${P}${KEY}Derived Name` }))
    expect(result.ok).toBe(true)
    if (result.ok) expect((await storedRow(result.data.id)).slug).toBe(`${P}${KEY}derived-name`)
  })

  it("reports invalid input as field errors", async () => {
    const result = await createCompetition({ eventEditionId: "x", disciplineId: "", name: " " })
    expect(result).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(fieldErrorKeys(result)).toEqual(["disciplineId", "eventEditionId", "name"])
  })
})

describe("referenced records", () => {
  it.each([
    ["an unknown edition", () => ({ eventEditionId: randomUuid }), "eventEditionId"],
    ["an unknown discipline", () => ({ disciplineId: randomUuid }), "disciplineId"],
    ["a deleted discipline", () => ({ disciplineId: deletedDisciplineId }), "disciplineId"],
    ["a discipline of a deleted sport", () => ({ disciplineId: disciplineOfDeletedSportId }), "disciplineId"],
    ["an unknown location", () => ({ locationId: randomUuid }), "locationId"],
  ])("rejects %s", async (_name, override, field) => {
    const result = await createCompetition(valid("refs", override()))
    expect(result).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { [field]: expect.any(Array) } } })
    expect(await db.competition.count({ where: { slug: `${P}${KEY}refs` } })).toBe(0)
  })

  it("rejects a deleted edition and a deleted location", async () => {
    await db.eventEdition.update({ where: { id: otherEditionId }, data: { deletedAt: new Date() } })
    expect(await createCompetition(valid("gone-ed", { eventEditionId: otherEditionId }))).toMatchObject({
      ok: false,
      error: { fieldErrors: { eventEditionId: expect.any(Array) } },
    })
    await db.location.update({ where: { id: locationB }, data: { deletedAt: new Date() } })
    expect(await createCompetition(valid("gone-loc", { locationId: locationB }))).toMatchObject({
      ok: false,
      error: { fieldErrors: { locationId: expect.any(Array) } },
    })
  })

  it("offers only active editions and disciplines (of active sports) as options", async () => {
    await db.eventEdition.update({ where: { id: otherEditionId }, data: { deletedAt: new Date() } })
    const editionIds = (await listEditionOptions()).map((option) => option.id)
    expect(editionIds).toContain(editionId)
    expect(editionIds).not.toContain(otherEditionId)
    const disciplines = await listDisciplineOptions()
    const disciplineIds = disciplines.map((option) => option.id)
    expect(disciplineIds).toEqual(expect.arrayContaining([trailDisciplineId, roadDisciplineId]))
    expect(disciplineIds).not.toContain(deletedDisciplineId)
    expect(disciplineIds).not.toContain(disciplineOfDeletedSportId)
    expect(disciplines.find((option) => option.id === trailDisciplineId)?.slug).toBe("trail-running")
  })
})

describe("effective dates and schedule validation", () => {
  const codeOf = async (extra: Record<string, unknown>) => {
    const result = await createCompetition(valid("schedule", extra))
    return result.ok ? "ok" : fieldErrorKeys(result).join(",")
  }

  it.each([
    ["an end date before the start date", { startsOn: "2030-05-11", endsOn: "2030-05-10" }, "endsOn"],
    ["an end date before the inherited start date", { endsOn: "2030-05-09" }, "endsOn"],
    ["a start date before the edition", { startsOn: "2030-05-09" }, "startsOn"],
    ["a start date after the edition", { startsOn: "2030-05-13" }, "startsOn"],
    ["an end date after the edition", { startsOn: "2030-05-12", endsOn: "2030-05-13" }, "endsOn"],
    ["an inherited single day moved by an own start after the edition's end", { startsOn: "2030-05-14" }, "startsOn"],
    ["an end time before the start time on a single day", { startTime: "10:00", endTime: "09:00" }, "endTime"],
    ["an end time before the start time with the same explicit start and end date", { startsOn: "2030-05-11", endsOn: "2030-05-11", startTime: "10:00", endTime: "09:00" }, "endTime"],
  ])("rejects %s", async (_name, extra, field) => {
    expect(await codeOf(extra)).toBe(field)
    expect(await db.competition.count({ where: { slug: `${P}${KEY}schedule` } })).toBe(0)
  })

  it.each([
    ["inheriting everything", {}],
    ["a multi-day competition inside the edition", { startsOn: "2030-05-10", endsOn: "2030-05-12" }],
    ["an overnight competition (later end date, earlier end time)", { startsOn: "2030-05-10", endsOn: "2030-05-11", startTime: "22:00", endTime: "04:00" }],
    ["times on an inherited date", { startTime: "06:00", endTime: "10:00" }],
    ["equal start and end times", { startTime: "06:00", endTime: "06:00" }],
    ["an own date that equals the edition's last day", { startsOn: "2030-05-12" }],
  ])("accepts %s", async (_name, extra) => {
    expect(await codeOf(extra)).toBe("ok")
  })

  it("does not inherit times from the edition", async () => {
    await db.eventEdition.update({ where: { id: editionId }, data: { startTime: "07:00", endTime: "12:00" } })
    const id = await create("no-time-inherit")
    expect(await storedRow(id)).toMatchObject({ startTime: null, endTime: null })
    const { items } = await listCompetitions({ eventEditionId: editionId })
    expect(items[0]).toMatchObject({ startTime: null, endTime: null })
    await db.eventEdition.update({ where: { id: editionId }, data: { startTime: null, endTime: null } })
  })

  it("allows undated competitions in an edition whose dates are to be announced", async () => {
    const id = await create("tba", { eventEditionId: tbaEditionId })
    const { items } = await listCompetitions({ eventEditionId: tbaEditionId })
    expect(items.find((item) => item.id === id)).toMatchObject({ effectiveStartsOn: null, effectiveEndsOn: null })
  })

  it("rejects an end date or a time when no effective start date exists", async () => {
    for (const [extra, field] of [
      [{ endsOn: "2030-05-10" }, "endsOn"],
      [{ startTime: "06:00" }, "startTime"],
      [{ endTime: "08:00" }, "endTime"],
    ] as const) {
      const result = await createCompetition(valid("tba-bad", { eventEditionId: tbaEditionId, ...extra }))
      expect(fieldErrorKeys(result)).toEqual([field])
    }
  })

  it("accepts its own dates under an edition without dates", async () => {
    const id = await create("tba-own", { eventEditionId: tbaEditionId, startsOn: "2032-01-01", endsOn: "2032-01-02" })
    expect((await getCompetition(id))?.startsOn).toBe("2032-01-01")
  })

  it("reports every schedule problem at once", async () => {
    const result = await createCompetition(valid("many", { startsOn: "2030-05-09", endsOn: "2030-05-08", disciplineId: randomUuid }))
    expect(fieldErrorKeys(result)).toEqual(["disciplineId", "endsOn", "startsOn"])
  })
})

describe("effective location", () => {
  it("falls back to the edition's location only when the competition has none", async () => {
    await create("inherit-loc")
    await create("own-loc", { locationId: locationB })
    const { items } = await listCompetitions({ eventEditionId: editionId })
    const byName = Object.fromEntries(items.map((item) => [item.slug, item]))
    expect(byName[`${P}${KEY}inherit-loc`]).toMatchObject({ locationInherited: true, locationLabel: `${P}Parque, ${P}Caracas` })
    expect(byName[`${P}${KEY}own-loc`]).toMatchObject({ locationInherited: false, locationLabel: `${P}Valencia` })
  })

  it("has no location when neither the competition nor the edition has one", async () => {
    await create("no-loc", { eventEditionId: otherEditionId })
    const { items } = await listCompetitions({ eventEditionId: otherEditionId })
    expect(items[0].locationLabel).toBeNull()
  })

  it("blocks deleting a location used by a competition", async () => {
    const { deleteLocation } = await import("@/features/locations/actions")
    await create("loc-used", { locationId: locationB })
    expect(await deleteLocation(locationB)).toMatchObject({ ok: false, error: { code: "conflict" } })
  })
})

describe("discipline metadata", () => {
  it("stores valid Trail Running metadata", async () => {
    const metadata = { distanceKm: 21.1, elevationGainMeters: 900, cutoffMinutes: 300, terrainTypes: ["mountain"], tags: ["night"], difficulty: "advanced", beginnerFriendly: false }
    const id = await create("trail-meta", { disciplineId: trailDisciplineId, metadata })
    expect((await storedRow(id)).metadata).toEqual(metadata)
  })

  it.each([
    ["a non-numeric distance", { distanceKm: "far" }, "metadata.distanceKm"],
    ["a non-positive distance", { distanceKm: 0 }, "metadata.distanceKm"],
    ["a fractional cutoff", { distanceKm: 10, cutoffMinutes: 90.5 }, "metadata.cutoffMinutes"],
    ["an unknown difficulty", { distanceKm: 10, difficulty: "insane" }, "metadata.difficulty"],
    ["an unknown property", { distanceKm: 10, laps: 3 }, "metadata"],
  ])("rejects Trail Running metadata with %s", async (_name, metadata, field) => {
    const result = await createCompetition(valid("trail-bad", { disciplineId: trailDisciplineId, metadata }))
    expect(result).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { [field]: expect.any(Array) } } })
    expect(await db.competition.count({ where: { slug: `${P}${KEY}trail-bad` } })).toBe(0)
  })

  it("stores Trail Running metadata without a distance and never adds one", async () => {
    const id = await create("trail-no-distance", { disciplineId: trailDisciplineId, metadata: { difficulty: "elite", elevationGainMeters: 800 } })
    expect((await storedRow(id)).metadata).toEqual({ difficulty: "elite", elevationGainMeters: 800 })
    expect((await updateCompetition(id, await updateInput(id, { name: `${P}${KEY}trail-no-distance 2` }))).ok).toBe(true)
    expect((await storedRow(id)).metadata).toEqual({ difficulty: "elite", elevationGainMeters: 800 })
  })

  it("accepts empty metadata for Trail Running and for disciplines without a schema, storing SQL NULL", async () => {
    for (const [key, extra] of [
      ["empty-trail", { disciplineId: trailDisciplineId, metadata: {} }],
      ["empty-road-null", { metadata: null }],
      ["empty-road-omitted", {}],
      ["empty-road-object", { metadata: {} }],
    ] as const) {
      const id = await create(key, extra)
      expect(await metadataIsSqlNull(id)).toBe(true)
    }
  })

  it("rejects non-empty metadata for a discipline without a schema", async () => {
    const result = await createCompetition(valid("road-meta", { metadata: { distanceKm: 10 } }))
    expect(result).toMatchObject({ ok: false, error: { fieldErrors: { metadata: expect.any(Array) } } })
  })

  it("does not accept arbitrary JSON shapes", async () => {
    for (const metadata of [[1, 2], "text", 5]) {
      expect(await createCompetition(valid("json", { disciplineId: trailDisciplineId, metadata }))).toMatchObject({ ok: false })
    }
  })

  it("preserves metadata when an unrelated field is edited and the form sends none", async () => {
    const metadata = { distanceKm: 42, difficulty: "elite" }
    const id = await create("keep-meta", { disciplineId: trailDisciplineId, metadata })
    expect((await updateCompetition(id, await updateInput(id, { name: `${P}${KEY}keep-meta renamed` }))).ok).toBe(true)
    expect((await storedRow(id)).metadata).toEqual(metadata)
  })

  it("preserves stored properties the form does not manage while replacing the managed ones", async () => {
    const id = await create("legacy-meta", { disciplineId: trailDisciplineId, metadata: { distanceKm: 10, elevationGainMeters: 500 } })
    await db.competition.update({ where: { id }, data: { metadata: { distanceKm: 10, elevationGainMeters: 500, aidStations: 4 } } })
    const result = await updateCompetition(id, await updateInput(id, { metadata: { distanceKm: 12 } }))
    expect(result.ok).toBe(true)
    expect((await storedRow(id)).metadata).toEqual({ distanceKm: 12, aidStations: 4 })
  })

  it("keeps stored metadata of a discipline without a schema when it is edited", async () => {
    const id = await create("road-keep")
    await db.competition.update({ where: { id }, data: { metadata: { division: "open" } } })
    expect((await updateCompetition(id, await updateInput(id, { metadata: {} }))).ok).toBe(true)
    expect((await storedRow(id)).metadata).toEqual({ division: "open" })
  })

  it("clears managed metadata when the form submits none of it", async () => {
    const id = await create("clear-meta", { disciplineId: trailDisciplineId, metadata: { distanceKm: 10 } })
    expect((await updateCompetition(id, await updateInput(id, { metadata: {} }))).ok).toBe(true)
    expect(await metadataIsSqlNull(id)).toBe(true)
  })

  it("requires explicit confirmation before a discipline change drops stored metadata", async () => {
    const id = await create("move-meta", { disciplineId: trailDisciplineId, metadata: { distanceKm: 10 } })
    const refused = await updateCompetition(id, await updateInput(id, { disciplineId: roadDisciplineId }))
    expect(refused).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { disciplineId: expect.any(Array) } } })
    expect(await storedRow(id)).toMatchObject({ disciplineId: trailDisciplineId, metadata: { distanceKm: 10 } })

    const confirmed = await updateCompetition(id, await updateInput(id, { disciplineId: roadDisciplineId, discardStoredMetadata: true }))
    expect(confirmed.ok).toBe(true)
    expect(await storedRow(id)).toMatchObject({ disciplineId: roadDisciplineId })
    expect(await metadataIsSqlNull(id)).toBe(true)
  })

  it("changes discipline freely when there is no stored metadata", async () => {
    const id = await create("move-plain")
    expect((await updateCompetition(id, await updateInput(id, { disciplineId: trailDisciplineId }))).ok).toBe(true)
    expect((await storedRow(id)).disciplineId).toBe(trailDisciplineId)
  })
})

describe("slugs", () => {
  it("rejects a duplicate slug within the same edition", async () => {
    await create("dup")
    const result = await createCompetition(valid("dup", { name: "Another name" }))
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
    expect(await db.competition.count({ where: { slug: `${P}${KEY}dup` } })).toBe(1)
  })

  it("allows the same slug and name in different editions", async () => {
    await create("shared", { name: "10K" })
    const other = await createCompetition(valid("shared", { eventEditionId: otherEditionId, name: "10K" }))
    expect(other.ok).toBe(true)
    expect(await db.competition.count({ where: { slug: `${P}${KEY}shared` } })).toBe(2)
  })

  it("allows similar names with different slugs in one edition", async () => {
    await create("similar-a", { name: "5K" })
    expect((await createCompetition(valid("similar-b", { name: "5K" }))).ok).toBe(true)
  })

  it("keeps the slug of a deleted competition reserved and says so", async () => {
    const id = await create("reserved")
    expect((await deleteCompetition(id)).ok).toBe(true)
    const result = await createCompetition(valid("reserved"))
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: [expect.stringContaining("deleted")] } } })
  })

  it("normalizes the slug", async () => {
    const result = await createCompetition(valid("norm", { slug: `${P}${KEY}Norm ÁB  C` }))
    expect(result.ok).toBe(true)
    if (result.ok) expect((await storedRow(result.data.id)).slug).toBe(`${P}${KEY}norm-ab-c`)
  })

  it("rejects a name that yields no slug", async () => {
    expect(await createCompetition(valid("x", { slug: "", name: "***" }))).toMatchObject({ ok: false, error: { fieldErrors: { slug: expect.any(Array) } } })
  })
})

describe("update", () => {
  it("updates fields and keeps the parent edition", async () => {
    const id = await create("upd", { startsOn: "2030-05-11" })
    const result = await updateCompetition(
      id,
      await updateInput(id, { name: `${P}${KEY}upd 2`, participationType: "RECREATIONAL", status: "CANCELLED", startsOn: "", locationId: locationB, eventEditionId: otherEditionId }),
    )
    expect(result).toMatchObject({ ok: true, data: { id } })
    expect(await storedRow(id)).toMatchObject({
      name: `${P}${KEY}upd 2`,
      participationType: "RECREATIONAL",
      status: "CANCELLED",
      startsOn: null,
      locationId: locationB,
      eventEditionId: editionId, // reassignment is ignored, never applied
    })
  })

  it("can keep its own slug and rejects a slug owned by another competition of the edition", async () => {
    const id = await create("own-slug")
    await create("taken-slug")
    expect((await updateCompetition(id, await updateInput(id))).ok).toBe(true)
    const result = await updateCompetition(id, await updateInput(id, { slug: `${P}${KEY}taken-slug` }))
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
    expect((await storedRow(id)).slug).toBe(`${P}${KEY}own-slug`)
  })

  it("validates the schedule against the edition on every edit", async () => {
    const id = await create("upd-sched")
    const result = await updateCompetition(id, await updateInput(id, { startsOn: "2030-05-20" }))
    expect(fieldErrorKeys(result)).toEqual(["startsOn"])
    expect((await storedRow(id)).startsOn).toBeNull()
  })

  it("returns not_found for missing, malformed and deleted competitions", async () => {
    const id = await create("upd-gone")
    const input = await updateInput(id)
    await deleteCompetition(id)
    for (const target of [id, randomUuid, "nope"]) {
      expect(await updateCompetition(target, input)).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })

  it("rolls back completely when the final write loses a slug race", async () => {
    const id = await create("rollback", { disciplineId: trailDisciplineId, metadata: { distanceKm: 10 } })
    const slug = `${P}${KEY}rollback-new`
    const rival = await holdTransaction(async (tx) => {
      await tx.competition.create({ data: { eventEditionId: editionId, disciplineId: roadDisciplineId, name: `${P}${KEY}rival`, slug } })
    })
    const pending = updateCompetition(id, await updateInput(id, { slug, name: `${P}${KEY}changed`, metadata: { distanceKm: 99 } }))
    await sleep(500) // let the action reach the blocked unique-index write
    await rival.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
    expect(await storedRow(id)).toMatchObject({ slug: `${P}${KEY}rollback`, name: `${P}${KEY}rollback`, metadata: { distanceKm: 10 } })
  })
})

describe("soft deletion", () => {
  it("soft-deletes, keeps the row and hides it from lists and the edit query", async () => {
    const id = await create("del")
    expect(await deleteCompetition(id)).toEqual({ ok: true, data: undefined })
    expect((await storedRow(id)).deletedAt).not.toBeNull()
    expect(await getCompetition(id)).toBeNull()
    expect((await listCompetitions({ eventEditionId: editionId })).items).toHaveLength(0)
    expect(await deleteCompetition(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("is blocked by active results and allowed once they are soft-deleted", async () => {
    const id = await create("del-results")
    const athlete = await db.athlete.create({ data: { firstName: "A", lastName: "B", fullName: `${P}${KEY}athlete` } })
    const result = await db.result.create({ data: { competitionId: id, athleteId: athlete.id } })
    expect(await deleteCompetition(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await storedRow(id)).deletedAt).toBeNull()
    await db.result.update({ where: { id: result.id }, data: { deletedAt: new Date() } })
    expect((await deleteCompetition(id)).ok).toBe(true)
    expect(await db.result.count({ where: { competitionId: id } })).toBe(1) // history is preserved
  })

  it("lets the edition be deleted only after its competitions are", async () => {
    const id = await create("del-edition", { eventEditionId: otherEditionId })
    expect(await deleteEventEdition(otherEditionId)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await deleteCompetition(id)
    expect((await deleteEventEdition(otherEditionId)).ok).toBe(true)
  })

  it("returns not_found for malformed ids", async () => {
    expect(await deleteCompetition("nope")).toMatchObject({ ok: false, error: { code: "not_found" } })
  })
})

describe("concurrent edition changes", () => {
  it("validates a new competition against the edition dates committed by a concurrent edition update", async () => {
    // Stand-in for updateEventEdition mid-flight: it holds the edition row and moves the window.
    const editionUpdate = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_editions WHERE id = ${editionId}::uuid FOR UPDATE`
      await tx.eventEdition.update({ where: { id: editionId }, data: { startsOn: localDateToDb("2030-07-01"), endsOn: localDateToDb("2030-07-02") } })
    })
    // Valid under the old window (2030-05-10 → 12), invalid under the one about to be committed.
    const pending = createCompetition(valid("window", { startsOn: "2030-05-11" }))
    expect(await staysBlocked(pending)).toBe(true)
    await editionUpdate.commit()
    expect(await pending).toMatchObject({ ok: false, error: { fieldErrors: { startsOn: expect.any(Array) } } })
    expect(await db.competition.count({ where: { slug: `${P}${KEY}window` } })).toBe(0)
  })

  it("makes an edition date change wait for an in-flight competition write and then see it", async () => {
    // Stand-in for createCompetition mid-flight: share lock on the edition and an uncommitted competition.
    const competitionWrite = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_editions WHERE id = ${editionId}::uuid AND deleted_at IS NULL FOR SHARE`
      await tx.competition.create({
        data: { eventEditionId: editionId, disciplineId: roadDisciplineId, name: `${P}${KEY}inflight`, slug: `${P}${KEY}inflight`, startsOn: localDateToDb("2030-05-10") },
      })
    })
    const edition = await getEventEdition(editionId)
    if (!edition) throw new Error("missing edition")
    const pending = updateEventEdition(editionId, {
      name: edition.name,
      slug: edition.slug,
      label: "",
      year: edition.year,
      startsOn: "2030-05-20", // would orphan the competition above
      endsOn: "2030-05-21",
      locationId: locationA,
      primaryOrganizerId: await primaryOrganizerFor(editionId),
      coOrganizerIds: [],
    })
    expect(await staysBlocked(pending)).toBe(true)
    await competitionWrite.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { startsOn: [expect.stringContaining(`${P}${KEY}inflight`)] } } })
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id: editionId } })).startsOn?.toISOString()).toBe("2030-05-10T00:00:00.000Z")
  })

  it("does not create a competition under an edition that is deleted concurrently", async () => {
    const editionDelete = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_editions WHERE id = ${otherEditionId}::uuid FOR UPDATE`
      await tx.eventEdition.update({ where: { id: otherEditionId }, data: { deletedAt: new Date() } })
    })
    const pending = createCompetition(valid("late", { eventEditionId: otherEditionId }))
    expect(await staysBlocked(pending)).toBe(true)
    await editionDelete.commit()
    expect(await pending).toMatchObject({ ok: false, error: { fieldErrors: { eventEditionId: expect.any(Array) } } })
    expect(await db.competition.count({ where: { eventEditionId: otherEditionId } })).toBe(0)
  })

  it("does not assign a location that is deleted concurrently", async () => {
    const locationDelete = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM locations WHERE id = ${locationB}::uuid FOR UPDATE`
      await tx.location.update({ where: { id: locationB }, data: { deletedAt: new Date() } })
    })
    const pending = createCompetition(valid("loc-race", { locationId: locationB }))
    expect(await staysBlocked(pending)).toBe(true)
    await locationDelete.commit()
    expect(await pending).toMatchObject({ ok: false, error: { fieldErrors: { locationId: expect.any(Array) } } })
  })

  it("lets exactly one of two concurrent creations with the same slug win", async () => {
    const results = await Promise.all([createCompetition(valid("same", { name: "one" })), createCompetition(valid("same", { name: "two" }))])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)[0]).toMatchObject({ error: { code: "conflict" } })
    expect(await db.competition.count({ where: { slug: `${P}${KEY}same` } })).toBe(1)
  })

  it("does not block deletes behind other competition writes of the same edition", async () => {
    const id = await create("parallel-a")
    const competitionWrite = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_editions WHERE id = ${editionId}::uuid FOR SHARE`
    })
    expect(await staysBlocked(deleteCompetition(id))).toBe(false)
    expect(await staysBlocked(createCompetition(valid("parallel-b")))).toBe(false) // share locks are compatible
    await competitionWrite.commit()
  })
})

async function primaryOrganizerFor(id: string) {
  const edition = await getEventEdition(id)
  if (edition?.primaryOrganizerId) return edition.primaryOrganizerId
  const organizer = await db.organizer.create({ data: { name: `${P}${KEY}org`, slug: `${P}${KEY}org` } })
  await db.eventEditionOrganizer.create({ data: { eventEditionId: id, organizerId: organizer.id, role: "PRIMARY" } })
  return organizer.id
}

describe("listing", () => {
  it("paginates, counts and never overlaps pages", async () => {
    await db.competition.createMany({
      data: Array.from({ length: 22 }, (_, index) => ({
        eventEditionId: otherEditionId,
        disciplineId: roadDisciplineId,
        name: `${P}${KEY}page ${String(index).padStart(2, "0")}`,
        slug: `${P}${KEY}page-${String(index).padStart(2, "0")}`,
      })),
    })
    const first = await listCompetitions({ eventEditionId: otherEditionId })
    const second = await listCompetitions({ eventEditionId: otherEditionId, page: 2 })
    expect(first).toMatchObject({ total: 22, page: 1, pageCount: 2 })
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(2)
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(22)
    expect((await listCompetitions({ eventEditionId: otherEditionId, page: 99 })).page).toBe(2)
    expect((await listCompetitions({ eventEditionId: otherEditionId, page: "abc" })).page).toBe(1)
  })

  it("searches name, slug, edition, series, discipline and location", async () => {
    await create("find-me", { name: `${P}${KEY}Zebra Trail`, locationId: locationB })
    await create("other")
    const search = async (q: string) => (await listCompetitions({ q, eventEditionId: editionId })).items.map((item) => item.slug)
    const only = [`${P}${KEY}find-me`]
    expect(await search("zebra")).toEqual(only)
    expect(await search("find-me")).toEqual(only)
    expect(await search(`${P}Valencia`)).toEqual(only) // own location
    expect(await search(`${P}Parque`)).toEqual([`${P}${KEY}other`]) // the edition's location counts when the competition has none
    expect((await search(`${P}cp-series`)).length).toBe(2) // series name
    expect((await search(`${P}cp-road`)).length).toBe(2) // discipline name
    expect(await search("no-such-thing")).toEqual([])
  })

  it("filters by status, participation type, edition and discipline", async () => {
    await create("f-active")
    await create("f-cancelled", { status: "CANCELLED" })
    await create("f-rec", { participationType: "RECREATIONAL", disciplineId: trailDisciplineId })
    await create("f-other-ed", { eventEditionId: otherEditionId })
    const slugs = async (filters: Parameters<typeof listCompetitions>[0]) => (await listCompetitions(filters)).items.map((item) => item.slug).sort()
    expect(await slugs({ eventEditionId: editionId, status: "CANCELLED" })).toEqual([`${P}${KEY}f-cancelled`])
    expect(await slugs({ eventEditionId: editionId, participationType: "RECREATIONAL" })).toEqual([`${P}${KEY}f-rec`])
    expect(await slugs({ eventEditionId: editionId, disciplineId: trailDisciplineId })).toEqual([`${P}${KEY}f-rec`])
    expect(await slugs({ eventEditionId: otherEditionId })).toEqual([`${P}${KEY}f-other-ed`])
    expect((await slugs({ eventEditionId: editionId })).length).toBe(3)
  })

  it("ignores invalid filter values instead of failing", async () => {
    await create("lenient")
    const list = await listCompetitions({ status: "NOPE", participationType: "X", eventEditionId: "bad", q: "  " })
    expect(list.items.length).toBeGreaterThan(0)
  })

  it("shows the competition's own dates for inheritance", async () => {
    await create("shown", { startsOn: "2030-05-11", endsOn: "2030-05-12", startTime: "07:00" })
    const { items } = await listCompetitions({ eventEditionId: editionId })
    expect(items[0]).toMatchObject({ effectiveStartsOn: "2030-05-11", effectiveEndsOn: "2030-05-12", startTime: "07:00", datesInherited: false })
  })
})

describe("edition screen (competitions of one edition)", () => {
  it("creates competitions under the given edition and lists only that edition's active competitions", async () => {
    const first = await create("edition-a", { startsOn: "2030-05-11" })
    const second = await create("edition-b")
    const elsewhere = await create("edition-c", { eventEditionId: otherEditionId })
    const deleted = await create("edition-d")
    await deleteCompetition(deleted)

    const listed = await listEditionCompetitions(editionId)
    expect(listed.map((competition) => competition.id).sort()).toEqual([first, second].sort())
    expect(listed.map((competition) => competition.id)).not.toContain(elsewhere)
    expect((await listEditionCompetitions(otherEditionId)).map((competition) => competition.id)).toEqual([elsewhere])
    expect(await storedRow(first)).toMatchObject({ eventEditionId: editionId })
  })

  it("returns form-ready values and the trail distance for the edit dialog", async () => {
    const id = await create("edition-trail", { disciplineId: trailDisciplineId, metadata: { distanceKm: 21.5 }, startsOn: "2030-05-11", startTime: "06:30" })
    const [item] = await listEditionCompetitions(editionId)
    expect(item).toMatchObject({ id, distanceKm: 21.5, startsOn: "2030-05-11", form: { eventEditionId: editionId, startsOn: "2030-05-11", startTime: "06:30", endsOn: "" } })
  })

  it("applies the same schedule and slug rules as the standalone form", async () => {
    const outsideWindow = await createCompetition(valid("edition-outside", { startsOn: "2030-06-20" }))
    expect(outsideWindow).toMatchObject({ ok: false, error: { code: "validation" } })
    await create("edition-dup")
    expect(await createCompetition(valid("edition-dup"))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await listEditionCompetitions(editionId)).toHaveLength(1)
  })

  it("returns nothing for a malformed or unknown edition id", async () => {
    expect(await listEditionCompetitions("not-a-uuid")).toEqual([])
    expect(await listEditionCompetitions(randomUuid)).toEqual([])
  })

  it("still requires an admin to create a competition", async () => {
    currentHeaders = userHeaders
    expect(await createCompetition(valid("edition-denied"))).toMatchObject({ ok: false, error: { code: "forbidden" } })
    currentHeaders = adminHeaders
  })
})
