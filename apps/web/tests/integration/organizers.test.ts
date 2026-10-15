import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { cleanupFixtures, createEdition, createSeries, createTestClient, P } from "./helpers"

// See locations.test.ts: feed requireAdmin the headers of whichever test user is "signed in".
let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { createOrganizer, updateOrganizer, deleteOrganizer } = await import("@/features/organizers/actions")
const { listOrganizers, getOrganizer } = await import("@/features/organizers/queries")

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

const valid = (key: string, extra: Record<string, unknown> = {}) => ({ name: `${P}${key}`, slug: `${P}${key}`, ...extra })

async function create(key: string, extra: Record<string, unknown> = {}) {
  const r = await createOrganizer(valid(key, extra))
  if (!r.ok) throw new Error(`fixture failed: ${r.error.message}`)
  return r.data.id
}

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await createUserWithPassword({ email: `${P}org-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}org-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("org-admin")
  userHeaders = await signIn("org-user")
})

beforeEach(async () => {
  const organizer = { slug: { startsWith: P } }
  await db.eventSeriesOrganizer.deleteMany({ where: { organizer } })
  await db.eventEditionOrganizer.deleteMany({ where: { organizer } })
  await db.organizer.deleteMany({ where: { slug: { startsWith: P } } })
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
        await createOrganizer(valid("auth-new")),
        await updateOrganizer(id, valid("auth", { name: "Changed" })),
        await deleteOrganizer(id),
      ]) {
        expect(r).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.organizer.count({ where: { slug: `${P}auth-new` } })).toBe(0)
    const row = await db.organizer.findUniqueOrThrow({ where: { slug: `${P}auth` } })
    expect(row.name).toBe(`${P}auth`)
    expect(row.deletedAt).toBeNull()
  })
})

describe("create", () => {
  it("creates an organizer with normalized values", async () => {
    const r = await createOrganizer({
      name: ` ${P}norm  club `, slug: `${P} Slug One`, website: "https://example.com", instagram: "@ItestClub", description: "  hi ",
    })
    expect(r.ok).toBe(true)
    const row = await db.organizer.findUniqueOrThrow({ where: { slug: `${P}slug-one` } })
    expect(row).toMatchObject({ name: `${P}norm club`, instagram: "itestclub", description: "hi", logoUrl: null })
    expect(row.website).toBe("https://example.com/")
  })

  it("derives a slug from the name when none is given", async () => {
    expect((await createOrganizer({ name: `${P}Derived Name` })).ok).toBe(true)
    expect(await db.organizer.count({ where: { slug: `${P.toLowerCase()}derived-name` } })).toBe(1)
  })

  it("returns field errors for invalid input", async () => {
    const r = await createOrganizer({ name: "", website: "javascript:x", instagram: "bad handle" })
    expect(r).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(!r.ok && Object.keys(r.error.fieldErrors ?? {}).sort()).toEqual(["instagram", "name", "website"])
  })

  it("rejects a duplicate slug", async () => {
    await create("dup-slug")
    const r = await createOrganizer(valid("dup-slug", { name: `${P}other-name` }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: expect.any(Array) } } })
  })

  it("rejects a slug reserved by a soft-deleted organizer", async () => {
    const id = await create("reserved")
    await deleteOrganizer(id)
    const r = await createOrganizer(valid("reserved", { name: `${P}another` }))
    expect(r).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(!r.ok && r.error.message).toMatch(/deleted/)
  })

  it("rejects the same organizer by name (case-insensitive), website or Instagram", async () => {
    await create("same", { website: "https://same.example.com", instagram: "itest_same" })
    const attempts = [
      { name: `${P.toUpperCase()}SAME`, slug: `${P}n1` },
      { name: `${P}x1`, slug: `${P}n2`, website: "https://same.example.com" },
      { name: `${P}x2`, slug: `${P}n3`, instagram: "https://instagram.com/ITEST_same/" },
    ]
    for (const a of attempts) expect(await createOrganizer(a)).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await db.organizer.count({ where: { slug: { in: [`${P}n1`, `${P}n2`, `${P}n3`] } } })).toBe(0)
  })

  it("allows the same name once the original is deleted (different slug)", async () => {
    const id = await create("again")
    await deleteOrganizer(id)
    expect((await createOrganizer(valid("again", { slug: `${P}again-2` }))).ok).toBe(true)
  })
})

describe("update", () => {
  it("updates fields and keeps metadata and relations intact", async () => {
    const id = await create("upd")
    await db.organizer.update({ where: { id }, data: { metadata: { organizerType: "club" } } })
    const series = await createSeries(db, "org-upd")
    await db.eventSeriesOrganizer.create({ data: { eventSeriesId: series.id, organizerId: id } })
    const r = await updateOrganizer(id, valid("upd", { name: `${P}upd-renamed`, instagram: "itest_upd" }))
    expect(r).toMatchObject({ ok: true })
    const row = await db.organizer.findUniqueOrThrow({ where: { id }, include: { seriesAssignments: true } })
    expect(row).toMatchObject({ name: `${P}upd-renamed`, instagram: "itest_upd", metadata: { organizerType: "club" } })
    expect(row.seriesAssignments).toHaveLength(1)
  })

  it("clears optional fields when emptied", async () => {
    const id = await create("clear", { description: "d", website: "https://a.example.com" })
    await updateOrganizer(id, valid("clear"))
    expect(await db.organizer.findUniqueOrThrow({ where: { id } })).toMatchObject({ description: null, website: null })
  })

  it("allows saving without changes (no self-conflict)", async () => {
    const id = await create("self", { website: "https://self.example.com" })
    expect((await updateOrganizer(id, valid("self", { website: "https://self.example.com" }))).ok).toBe(true)
  })

  it("rejects taking another organizer's slug or name and leaves the row unchanged", async () => {
    const a = await create("a")
    await create("b")
    expect(await updateOrganizer(a, valid("a", { slug: `${P}b` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await updateOrganizer(a, valid("a", { name: `${P}b` }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.organizer.findUniqueOrThrow({ where: { id: a } })).name).toBe(`${P}a`)
  })

  it("returns not_found for unknown, malformed or deleted ids", async () => {
    const id = await create("gone")
    await deleteOrganizer(id)
    for (const bad of [id, "00000000-0000-4000-8000-000000000000", "nope"]) {
      expect(await updateOrganizer(bad, valid("x"))).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })
})

describe("soft delete", () => {
  it("marks the row deleted, keeps it in the table and hides it from reads", async () => {
    const id = await create("del")
    expect(await deleteOrganizer(id)).toMatchObject({ ok: true })
    expect((await db.organizer.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
    expect(await getOrganizer(id)).toBeNull()
    expect((await listOrganizers({ q: `${P}del` })).total).toBe(0)
    expect(await deleteOrganizer(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await deleteOrganizer("nope")).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("refuses to delete an organizer assigned to an active series or edition and preserves the assignment", async () => {
    const id = await create("used")
    const series = await createSeries(db, "org-used")
    const edition = await createEdition(db, series.id, "org-used-ed")
    await db.eventSeriesOrganizer.create({ data: { eventSeriesId: series.id, organizerId: id } })
    await db.eventEditionOrganizer.create({ data: { eventEditionId: edition.id, organizerId: id } })
    expect(await deleteOrganizer(id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.organizer.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    expect(await db.eventSeriesOrganizer.count({ where: { organizerId: id } })).toBe(1)
    expect(await db.eventEditionOrganizer.count({ where: { organizerId: id } })).toBe(1)
  })

  it("ignores soft-deleted series/editions when checking usage, and keeps their assignments", async () => {
    const id = await create("used-deleted")
    const series = await createSeries(db, "org-used2")
    const edition = await createEdition(db, series.id, "org-used2-ed", { deletedAt: new Date() })
    await db.eventEditionOrganizer.create({ data: { eventEditionId: edition.id, organizerId: id } })
    await db.eventSeries.update({ where: { id: series.id }, data: { deletedAt: new Date() } })
    await db.eventSeriesOrganizer.create({ data: { eventSeriesId: series.id, organizerId: id } })
    expect(await deleteOrganizer(id)).toMatchObject({ ok: true })
    expect(await db.eventEditionOrganizer.count({ where: { organizerId: id } })).toBe(1)
    expect(await db.eventSeriesOrganizer.count({ where: { organizerId: id } })).toBe(1)
  })
})

describe("listing", () => {
  it("filters by name, slug, Instagram, website and description, case-insensitively", async () => {
    await create("l1", { name: `${P}Club Andino`, instagram: "andinoclub" })
    await create("l2", { name: `${P}Liga Zuliana`, website: "https://zulia.example.com", description: "Corredores" })
    const slugs = async (q: string) => (await listOrganizers({ q })).items.map((i) => i.slug).sort()
    expect(await slugs("club andino")).toEqual([`${P}l1`])
    expect(await slugs("ANDINOCLUB")).toEqual([`${P}l1`])
    expect(await slugs("zulia.example")).toEqual([`${P}l2`])
    expect(await slugs("corredores")).toEqual([`${P}l2`])
    expect(await slugs(`${P}l`)).toEqual([`${P}l1`, `${P}l2`])
    expect(await slugs(`${P}nothing`)).toEqual([])
  })

  it("paginates, clamps out-of-range pages and orders stably", async () => {
    for (let i = 0; i < 23; i++) await create(`p${String(i).padStart(2, "0")}`)
    const p1 = await listOrganizers({ q: `${P}p`, page: 1 })
    const p2 = await listOrganizers({ q: `${P}p`, page: 2 })
    expect([p1.total, p1.pageCount, p1.items.length, p2.items.length]).toEqual([23, 2, 20, 3])
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(23)
    expect((await listOrganizers({ q: `${P}p`, page: 99 })).page).toBe(2)
  })

  it("reports active assignment counts and hides metadata", async () => {
    const id = await create("counts")
    const series = await createSeries(db, "org-counts")
    const edition = await createEdition(db, series.id, "org-counts-ed")
    await db.eventSeriesOrganizer.create({ data: { eventSeriesId: series.id, organizerId: id } })
    await db.eventEditionOrganizer.create({ data: { eventEditionId: edition.id, organizerId: id } })
    const [item] = (await listOrganizers({ q: `${P}counts` })).items
    expect(item).toMatchObject({ seriesCount: 1, editionCount: 1, metadata: undefined })
  })
})
