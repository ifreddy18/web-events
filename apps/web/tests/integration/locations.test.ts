import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { cleanupFixtures, createEdition, createSeries, createTestClient, P } from "./helpers"

// Actions call requireAdmin() with the current request's headers. Outside Next there is
// no request, so feed it the headers of whichever test user is "signed in".
let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { createLocation, updateLocation, deleteLocation } = await import("@/features/locations/actions")
const { listLocations, getLocation } = await import("@/features/locations/queries")

const PASSWORD = "correct-horse-battery"
let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

const valid = (key: string, extra: Record<string, unknown> = {}) => ({
  country: "Venezuela",
  city: `${P}${key}`,
  slug: `${P}${key}`,
  ...extra,
})

async function create(key: string, extra: Record<string, unknown> = {}) {
  const r = await createLocation(valid(key, extra))
  if (!r.ok) throw new Error(`fixture failed: ${r.error.message}`)
  return r.data.id
}

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await createUserWithPassword({ email: `${P}loc-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}loc-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("loc-admin")
  userHeaders = await signIn("loc-user")
})

beforeEach(async () => {
  await db.location.deleteMany({ where: { slug: { startsWith: P } } })
  currentHeaders = adminHeaders
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
      for (const r of [
        await createLocation(valid("auth-new")),
        await updateLocation(id, valid("auth", { city: "Changed" })),
        await deleteLocation(id),
      ]) {
        expect(r).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.location.count({ where: { slug: `${P}auth-new` } })).toBe(0)
    const row = await db.location.findUniqueOrThrow({ where: { slug: `${P}auth` } })
    expect(row.city).toBe(`${P}auth`)
    expect(row.deletedAt).toBeNull()
  })
})

describe("create", () => {
  it("creates a location with normalized values and coordinates", async () => {
    const r = await createLocation({ country: " Venezuela ", state: "Mérida", city: `${P}c`, slug: `${P} Slug One`, latitude: "8.5897", longitude: "-71.1561" })
    expect(r.ok).toBe(true)
    const row = await db.location.findFirst({ where: { city: `${P}c` } })
    expect(row?.country).toBe("Venezuela")
    expect(row?.latitude?.toNumber()).toBe(8.5897)
  })

  it("derives a slug when none is given", async () => {
    const r = await createLocation({ country: "Venezuela", city: `${P}derived` })
    expect(r.ok).toBe(true)
    expect((await db.location.findFirstOrThrow({ where: { city: `${P}derived` } })).slug).toBe(`${P}derived-venezuela`)
  })

  it("returns field errors for invalid input", async () => {
    const r = await createLocation({ country: "", latitude: "5" })
    expect(r).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(!r.ok && Object.keys(r.error.fieldErrors ?? {}).sort()).toEqual(["country", "longitude"])
  })

  it("rejects a duplicate slug", async () => {
    await create("dup-slug")
    const r = await createLocation(valid("dup-slug", { city: "Other city" }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
  })

  it("rejects a slug reserved by a soft-deleted location", async () => {
    const id = await create("reserved")
    await deleteLocation(id)
    const r = await createLocation(valid("reserved", { city: "Another" }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(!r.ok && r.error.message).toMatch(/deleted/)
  })

  it("rejects the same place under a different slug (case-insensitive)", async () => {
    await create("same-place", { venueName: "Parque", address: "Av. 1" })
    const r = await createLocation({ country: "venezuela", city: `${P}SAME-PLACE`, venueName: " parque ", address: "av. 1", slug: `${P}other` })
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await db.location.count({ where: { slug: `${P}other` } })).toBe(0)
  })

  it("allows a similar place that differs in a detail, and the same place once the original is deleted", async () => {
    const id = await create("similar", { venueName: "A" })
    expect((await createLocation(valid("similar", { venueName: "B", slug: `${P}similar-b` }))).ok).toBe(true)
    await deleteLocation(id)
    expect((await createLocation(valid("similar", { venueName: "A", slug: `${P}similar-a2` }))).ok).toBe(true)
  })
})

describe("update", () => {
  it("updates fields and keeps unrelated data (metadata) intact", async () => {
    const id = await create("upd")
    await db.location.update({ where: { id }, data: { metadata: { note: "keep" } } })
    const r = await updateLocation(id, valid("upd", { city: `${P}upd-renamed`, state: "Lara" }))
    expect(r).toMatchObject({ ok: true })
    const row = await db.location.findUniqueOrThrow({ where: { id } })
    expect(row).toMatchObject({ city: `${P}upd-renamed`, state: "Lara", metadata: { note: "keep" } })
  })

  it("allows saving without changing the slug or place (no self-conflict)", async () => {
    const id = await create("self")
    expect((await updateLocation(id, valid("self"))).ok).toBe(true)
  })

  it("rejects taking another location's slug or place and leaves the row unchanged", async () => {
    const a = await create("a")
    await create("b", { venueName: "B venue" })
    expect(await updateLocation(a, valid("a", { slug: `${P}b` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await updateLocation(a, valid("b", { slug: `${P}a`, venueName: "B venue" }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.location.findUniqueOrThrow({ where: { id: a } })).city).toBe(`${P}a`)
  })

  it("returns not_found for unknown, malformed or deleted ids", async () => {
    const id = await create("gone")
    await deleteLocation(id)
    for (const bad of [id, "00000000-0000-4000-8000-000000000000", "nope"]) {
      expect(await updateLocation(bad, valid("x"))).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })
})

describe("country compatibility", () => {
  it("keeps a legacy country text untouched when other fields are edited", async () => {
    const id = await create("legacy-country", { country: "venezuela" })
    const r = await updateLocation(id, valid("legacy-country", { country: "venezuela", address: "Av. 2" }))
    expect(r.ok).toBe(true)
    expect(await db.location.findUniqueOrThrow({ where: { id } })).toMatchObject({ country: "venezuela", address: "Av. 2" })
  })

  it("treats the selector's name and legacy casing as the same place", async () => {
    await create("country-case", { country: "Venezuela" })
    const r = await createLocation({ country: "venezuela", city: `${P}country-case`, slug: `${P}country-case-b` })
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
  })

  it("derives the same slug from a selected country name as before", async () => {
    const r = await createLocation({ country: "Venezuela", city: `${P}Slug City` })
    expect(r.ok).toBe(true)
    if (r.ok) expect(await db.location.findUniqueOrThrow({ where: { id: r.data.id } })).toMatchObject({ slug: `${P}slug-city-venezuela`.replace(/_/g, "-") })
  })
})

describe("soft delete", () => {
  it("marks the row deleted, keeps it in the table and hides it from reads", async () => {
    const id = await create("del")
    expect(await deleteLocation(id)).toMatchObject({ ok: true })
    expect((await db.location.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
    expect(await getLocation(id)).toBeNull()
    expect((await listLocations({ q: `${P}del` })).total).toBe(0)
    expect(await deleteLocation(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("refuses to delete a location used by an active edition and preserves the relation", async () => {
    const id = await create("used")
    const series = await createSeries(db, "loc-used")
    const edition = await createEdition(db, series.id, "loc-used-ed", { locationId: id })
    const r = await deleteLocation(id)
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.location.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id: edition.id } })).locationId).toBe(id)
  })

  it("ignores soft-deleted editions when checking usage, and keeps their link", async () => {
    const id = await create("used-deleted")
    const series = await createSeries(db, "loc-used2")
    const edition = await createEdition(db, series.id, "loc-used2-ed", { locationId: id, deletedAt: new Date() })
    expect(await deleteLocation(id)).toMatchObject({ ok: true })
    expect((await db.eventEdition.findUniqueOrThrow({ where: { id: edition.id } })).locationId).toBe(id)
  })
})

describe("listing", () => {
  it("filters by name and geographic fields, case-insensitively", async () => {
    await create("l1", { venueName: "Estadio Metropolitano", state: "Lara" })
    await create("l2", { venueName: "Parque Central", state: "Zulia" })
    const names = async (q: string) => (await listLocations({ q })).items.map((i) => i.slug).sort()
    expect(await names("metropolitano")).toEqual([`${P}l1`])
    expect(await names("zulia")).toEqual([`${P}l2`])
    expect(await names(`${P}l`)).toEqual([`${P}l1`, `${P}l2`])
    expect(await names(`${P}nothing`)).toEqual([])
  })

  it("paginates, clamps out-of-range pages and orders stably", async () => {
    for (let i = 0; i < 23; i++) await create(`p${String(i).padStart(2, "0")}`, { venueName: `V${String(i).padStart(2, "0")}` })
    const p1 = await listLocations({ q: `${P}p`, page: 1 })
    const p2 = await listLocations({ q: `${P}p`, page: 2 })
    expect([p1.total, p1.pageCount, p1.items.length, p2.items.length]).toEqual([23, 2, 20, 3])
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(23)
    expect((await listLocations({ q: `${P}p`, page: 99 })).page).toBe(2)
  })

  it("reports active usage counts and numeric coordinates", async () => {
    const id = await create("counts", { latitude: "1.5", longitude: "2.5" })
    const series = await createSeries(db, "loc-counts")
    await createEdition(db, series.id, "loc-counts-ed", { locationId: id })
    const [item] = (await listLocations({ q: `${P}counts` })).items
    expect(item).toMatchObject({ editionCount: 1, competitionCount: 0, latitude: 1.5, longitude: 2.5 })
  })
})
