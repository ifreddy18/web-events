import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { cleanupFixtures, createEdition, createOrganizer, createTestClient, P } from "./helpers"

let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Lets a test simulate losing a race on the slug: the pre-check sees it as free, the DB does not.
let slugAlwaysFree = false
vi.mock("@/features/event-series/queries", async (importActual) => {
  const actual = await importActual<typeof import("@/features/event-series/queries")>()
  return { ...actual, findSlugOwner: (slug: string) => (slugAlwaysFree ? Promise.resolve(null) : actual.findSlugOwner(slug)) }
})

const { createEventSeries, updateEventSeries, deleteEventSeries } = await import("@/features/event-series/actions")
const { listEventSeries, getEventSeries } = await import("@/features/event-series/queries")
const { deleteOrganizer } = await import("@/features/organizers/actions")

const PASSWORD = "correct-horse-battery"
let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers
let disciplineId: string
let otherDisciplineId: string
let orgA: string
let orgB: string
let orgC: string

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

const valid = (key: string, extra: Record<string, unknown> = {}) => ({
  name: `${P}${key}`,
  slug: `${P}${key}`,
  disciplineId,
  primaryOrganizerId: orgA,
  coOrganizerIds: [],
  ...extra,
})

async function create(key: string, extra: Record<string, unknown> = {}) {
  const r = await createEventSeries(valid(key, extra))
  if (!r.ok) throw new Error(`fixture failed: ${r.error.message}`)
  return r.data.id
}

const assignments = async (id: string) =>
  (await db.eventSeriesOrganizer.findMany({ where: { eventSeriesId: id }, orderBy: { createdAt: "asc" } })).map((a) => `${a.organizerId}:${a.role}`).sort()

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await createUserWithPassword({ email: `${P}es-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}es-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("es-admin")
  userHeaders = await signIn("es-user")
  const sport = await db.sport.create({ data: { name: `${P}es-sport`, slug: `${P}es-sport` } })
  disciplineId = (await db.discipline.create({ data: { name: `${P}es-disc`, slug: `${P}es-disc`, sportId: sport.id } })).id
  otherDisciplineId = (await db.discipline.create({ data: { name: `${P}es-disc2`, slug: `${P}es-disc2`, sportId: sport.id } })).id
  orgA = (await createOrganizer(db, "es-a")).id
  orgB = (await createOrganizer(db, "es-b")).id
  orgC = (await createOrganizer(db, "es-c")).id
})

beforeEach(async () => {
  slugAlwaysFree = false
  currentHeaders = adminHeaders
  const series = { eventSeries: { slug: { startsWith: P } } }
  await db.eventEditionOrganizer.deleteMany({ where: { eventEdition: series } })
  await db.eventEdition.deleteMany({ where: series })
  await db.eventSeriesOrganizer.deleteMany({ where: series })
  await db.eventSeries.deleteMany({ where: { slug: { startsWith: P } } })
  await db.organizer.updateMany({ where: { id: { in: [orgA, orgB, orgC] } }, data: { deletedAt: null } })
  await db.sport.updateMany({ where: { slug: `${P}es-sport` }, data: { deletedAt: null } })
  await db.discipline.updateMany({ where: { slug: { startsWith: `${P}es-disc` } }, data: { deletedAt: null } })
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
      for (const r of [
        await createEventSeries(valid("auth-new")),
        await updateEventSeries(id, valid("auth", { name: "Changed", primaryOrganizerId: orgC, coOrganizerIds: [] })),
        await deleteEventSeries(id),
      ]) {
        expect(r).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.eventSeries.count({ where: { slug: `${P}auth-new` } })).toBe(0)
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`].sort())
  })
})

describe("create", () => {
  it("creates a series with a primary and several co-organizers in one go", async () => {
    const id = await create("multi", { name: `  ${P}multi   series `, slug: `${P} Multi`, instagram: "@Itest", coOrganizerIds: [orgB, orgC] })
    const row = await db.eventSeries.findUniqueOrThrow({ where: { id } })
    expect(row).toMatchObject({ name: `${P}multi series`, slug: `${P}multi`, instagram: "itest", status: "ACTIVE", disciplineId })
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`, `${orgC}:CO_ORGANIZER`].sort())
  })

  it("derives a slug from the name when none is given", async () => {
    expect((await createEventSeries({ ...valid("derived"), slug: "", name: `${P}Derived Name` })).ok).toBe(true)
    expect(await db.eventSeries.count({ where: { slug: `${P}derived-name` } })).toBe(1)
  })

  it("returns field errors for invalid input and creates nothing", async () => {
    const r = await createEventSeries({ name: "", disciplineId: "x", primaryOrganizerId: "", coOrganizerIds: [orgB, orgB] })
    expect(r).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(!r.ok && Object.keys(r.error.fieldErrors ?? {}).sort()).toEqual(["coOrganizerIds", "disciplineId", "name", "primaryOrganizerId"])
  })

  it("requires exactly one primary and rejects the primary also listed as co-organizer", async () => {
    expect(await createEventSeries(valid("nop", { primaryOrganizerId: undefined }))).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await createEventSeries(valid("dupprimary", { coOrganizerIds: [orgA] }))).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await db.eventSeries.count({ where: { slug: { in: [`${P}nop`, `${P}dupprimary`] } } })).toBe(0)
  })

  it("rejects deleted or unknown organizers and disciplines", async () => {
    await db.organizer.update({ where: { id: orgB }, data: { deletedAt: new Date() } })
    expect(await createEventSeries(valid("del-co", { coOrganizerIds: [orgB] }))).toMatchObject({ ok: false, error: { fieldErrors: { coOrganizerIds: expect.any(Array) } } })
    expect(await createEventSeries(valid("del-primary", { primaryOrganizerId: orgB }))).toMatchObject({ ok: false, error: { fieldErrors: { primaryOrganizerId: expect.any(Array) } } })
    expect(await createEventSeries(valid("unknown", { coOrganizerIds: ["00000000-0000-4000-8000-000000000000"] }))).toMatchObject({ ok: false })
    expect(await createEventSeries(valid("no-disc", { disciplineId: "00000000-0000-4000-8000-000000000000" }))).toMatchObject({ ok: false, error: { fieldErrors: { disciplineId: expect.any(Array) } } })
    await db.discipline.update({ where: { id: disciplineId }, data: { deletedAt: new Date() } })
    expect(await createEventSeries(valid("del-disc"))).toMatchObject({ ok: false, error: { fieldErrors: { disciplineId: expect.any(Array) } } })
    expect(await db.eventSeries.count({ where: { slug: { startsWith: P } } })).toBe(0)
  })

  it("rejects a deleted sport's discipline", async () => {
    await db.sport.update({ where: { slug: `${P}es-sport` }, data: { deletedAt: new Date() } })
    expect(await createEventSeries(valid("del-sport"))).toMatchObject({ ok: false, error: { fieldErrors: { disciplineId: expect.any(Array) } } })
  })

  it("rejects duplicate slugs, reserved slugs of deleted series, and same name in a discipline", async () => {
    const id = await create("dup")
    expect(await createEventSeries(valid("dup", { name: `${P}other` }))).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
    expect(await createEventSeries(valid("dup2", { name: `${P.toUpperCase()}DUP` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await createEventSeries(valid("dup3", { name: `${P}dup`, disciplineId: otherDisciplineId }))).ok).toBe(true)
    await deleteEventSeries(id)
    const r = await createEventSeries(valid("dup", { name: `${P}other2` }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(!r.ok && r.error.message).toMatch(/deleted/)
  })

  it("maps a lost slug race (P2002) to a conflict and leaves no partial rows", async () => {
    await create("race")
    slugAlwaysFree = true
    expect(await createEventSeries(valid("race", { name: `${P}race-2`, coOrganizerIds: [orgB] }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await db.eventSeries.count({ where: { name: `${P}race-2` } })).toBe(0)
    expect(await db.eventSeriesOrganizer.count({ where: { organizerId: orgB, eventSeries: { slug: { startsWith: P } } } })).toBe(0)
  })
})

describe("update", () => {
  it("updates fields and keeps metadata, unchanged assignment rows and other data intact", async () => {
    const id = await create("upd", { coOrganizerIds: [orgB] })
    await db.eventSeries.update({ where: { id }, data: { metadata: { tags: ["keep"] } } })
    const before = await db.eventSeriesOrganizer.findMany({ where: { eventSeriesId: id }, orderBy: { organizerId: "asc" } })
    const r = await updateEventSeries(id, valid("upd", { name: `${P}upd-renamed`, status: "ARCHIVED", disciplineId: otherDisciplineId, coOrganizerIds: [orgB] }))
    expect(r).toMatchObject({ ok: true })
    const row = await db.eventSeries.findUniqueOrThrow({ where: { id } })
    expect(row).toMatchObject({ name: `${P}upd-renamed`, status: "ARCHIVED", disciplineId: otherDisciplineId, metadata: { tags: ["keep"] } })
    const after = await db.eventSeriesOrganizer.findMany({ where: { eventSeriesId: id }, orderBy: { organizerId: "asc" } })
    expect(after.map((a) => [a.id, a.createdAt])).toEqual(before.map((a) => [a.id, a.createdAt]))
  })

  it("adds, removes and keeps co-organizers", async () => {
    const id = await create("co", { coOrganizerIds: [orgB] })
    await updateEventSeries(id, valid("co", { coOrganizerIds: [orgC] }))
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`, `${orgC}:CO_ORGANIZER`].sort())
    await updateEventSeries(id, valid("co", { coOrganizerIds: [orgB, orgC] }))
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`, `${orgC}:CO_ORGANIZER`].sort())
    await updateEventSeries(id, valid("co"))
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`])
  })

  it("swaps the primary with an existing co-organizer", async () => {
    const id = await create("swap", { coOrganizerIds: [orgB] })
    expect((await updateEventSeries(id, valid("swap", { primaryOrganizerId: orgB, coOrganizerIds: [orgA] }))).ok).toBe(true)
    expect(await assignments(id)).toEqual([`${orgA}:CO_ORGANIZER`, `${orgB}:PRIMARY`].sort())
  })

  it("replaces the primary with a new organizer, dropping or demoting the old one", async () => {
    const id = await create("replace")
    await updateEventSeries(id, valid("replace", { primaryOrganizerId: orgB }))
    expect(await assignments(id)).toEqual([`${orgB}:PRIMARY`])
    await updateEventSeries(id, valid("replace", { primaryOrganizerId: orgC, coOrganizerIds: [orgB] }))
    expect(await assignments(id)).toEqual([`${orgB}:CO_ORGANIZER`, `${orgC}:PRIMARY`].sort())
    expect(await db.eventSeriesOrganizer.count({ where: { eventSeriesId: id, role: "PRIMARY" } })).toBe(1)
  })

  it("allows saving without changes (no self-conflict)", async () => {
    const id = await create("self", { coOrganizerIds: [orgB] })
    expect((await updateEventSeries(id, valid("self", { coOrganizerIds: [orgB] }))).ok).toBe(true)
  })

  it("rejects invalid organizers and leaves assignments and fields unchanged", async () => {
    const id = await create("inv", { coOrganizerIds: [orgB] })
    await db.organizer.update({ where: { id: orgC }, data: { deletedAt: new Date() } })
    for (const extra of [
      { coOrganizerIds: [orgC] },
      { primaryOrganizerId: orgC },
      { coOrganizerIds: [orgB, orgB] },
      { primaryOrganizerId: undefined },
    ]) {
      expect(await updateEventSeries(id, valid("inv", { name: `${P}inv-changed`, ...extra }))).toMatchObject({ ok: false })
    }
    expect(await assignments(id)).toEqual([`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`].sort())
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id } })).name).toBe(`${P}inv`)
  })

  it("rejects another series' slug or name and leaves the row unchanged", async () => {
    const a = await create("a")
    await create("b")
    expect(await updateEventSeries(a, valid("a", { slug: `${P}b` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await updateEventSeries(a, valid("a", { name: `${P}b` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id: a } })).name).toBe(`${P}a`)
  })

  it("rolls back assignment changes when the slug write fails (transaction)", async () => {
    const a = await create("rb-a", { coOrganizerIds: [orgB] })
    await create("rb-b")
    slugAlwaysFree = true // pre-check passes, the unique index rejects the final write
    const r = await updateEventSeries(a, valid("rb-a", { slug: `${P}rb-b`, primaryOrganizerId: orgB, coOrganizerIds: [orgC] }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await assignments(a)).toEqual([`${orgA}:PRIMARY`, `${orgB}:CO_ORGANIZER`].sort())
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id: a } })).slug).toBe(`${P}rb-a`)
  })

  it("returns not_found for unknown, malformed or deleted ids", async () => {
    const id = await create("gone")
    await deleteEventSeries(id)
    for (const bad of [id, "00000000-0000-4000-8000-000000000000", "nope"]) {
      expect(await updateEventSeries(bad, valid("x"))).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })
})

describe("soft delete", () => {
  it("marks the row deleted, keeps assignments, hides it from reads and allows a second call to report not_found", async () => {
    const id = await create("del", { coOrganizerIds: [orgB] })
    expect(await deleteEventSeries(id)).toMatchObject({ ok: true })
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
    expect(await assignments(id)).toHaveLength(2)
    expect(await getEventSeries(id)).toBeNull()
    expect((await listEventSeries({ q: `${P}del` })).total).toBe(0)
    expect(await deleteEventSeries(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await deleteEventSeries("nope")).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("refuses to delete a series with active editions; ignores deleted editions", async () => {
    const id = await create("used")
    const edition = await createEdition(db, id, "es-used-ed")
    expect(await deleteEventSeries(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.eventSeries.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    await db.eventEdition.update({ where: { id: edition.id }, data: { deletedAt: new Date() } })
    expect(await deleteEventSeries(id)).toMatchObject({ ok: true })
    expect(await db.eventEdition.count({ where: { id: edition.id } })).toBe(1)
  })

  it("lets a series block deleting its organizers, and frees them once the series is deleted", async () => {
    const id = await create("org-block", { primaryOrganizerId: orgC })
    expect(await deleteOrganizer(orgC)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await deleteEventSeries(id)
    expect(await deleteOrganizer(orgC)).toMatchObject({ ok: true })
    expect(await assignments(id)).toEqual([`${orgC}:PRIMARY`]) // history preserved
  })
})

describe("listing", () => {
  it("searches name, slug, discipline and organizer names, and filters by status/discipline", async () => {
    await create("l1", { name: `${P}Vuelta Lago`, coOrganizerIds: [orgB] })
    await create("l2", { name: `${P}Gran Fondo`, status: "ARCHIVED", disciplineId: otherDisciplineId })
    const slugs = async (p: Parameters<typeof listEventSeries>[0]) => (await listEventSeries(p)).items.map((i) => i.slug).sort()
    expect(await slugs({ q: "vuelta lago" })).toEqual([`${P}l1`])
    expect(await slugs({ q: `${P}es-disc2` })).toEqual([`${P}l2`])
    expect(await slugs({ q: `${P}es-b` })).toEqual([`${P}l1`])
    expect(await slugs({ q: `${P}l`, status: "ARCHIVED" })).toEqual([`${P}l2`])
    expect(await slugs({ q: `${P}l`, disciplineId })).toEqual([`${P}l1`])
    expect(await slugs({ q: `${P}nothing` })).toEqual([])
  })

  it("paginates, clamps out-of-range pages and orders stably", async () => {
    for (let i = 0; i < 23; i++) await create(`p${String(i).padStart(2, "0")}`)
    const p1 = await listEventSeries({ q: `${P}p`, page: 1 })
    const p2 = await listEventSeries({ q: `${P}p`, page: 2 })
    expect([p1.total, p1.pageCount, p1.items.length, p2.items.length]).toEqual([23, 2, 20, 3])
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(23)
    expect((await listEventSeries({ q: `${P}p`, page: 99 })).page).toBe(2)
  })

  it("reports primary organizer, co-organizer and active edition counts; getEventSeries splits roles", async () => {
    const id = await create("counts", { coOrganizerIds: [orgB, orgC] })
    await createEdition(db, id, "es-counts-ed")
    const [item] = (await listEventSeries({ q: `${P}counts` })).items
    expect(item).toMatchObject({ primaryOrganizer: `${P}es-a`, coOrganizerCount: 2, editionCount: 1 })
    const got = await getEventSeries(id)
    expect(got?.primaryOrganizerId).toBe(orgA)
    expect([...(got?.coOrganizerIds ?? [])].sort()).toEqual([orgB, orgC].sort())
  })
})
