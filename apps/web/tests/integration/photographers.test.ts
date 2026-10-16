import type { PrismaClient } from "@prisma/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { seedProviderTypes } from "../../prisma/seed/catalog"
import { createUserWithPassword } from "@/server/auth/provision"
import { auth } from "@/server/auth/auth"
import { prisma } from "@/server/db/prisma"
import { cleanupFixtures, createSeries, createTestClient, P } from "./helpers"

let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Lets a test simulate losing a race on the slug: the pre-check sees it as free, the DB does not.
let slugAlwaysFree = false
vi.mock("@/features/photographers/queries", async (importActual) => {
  const actual = await importActual<typeof import("@/features/photographers/queries")>()
  return { ...actual, findSlugOwner: (slug: string) => (slugAlwaysFree ? Promise.resolve(null) : actual.findSlugOwner(slug)) }
})

const { createPhotographer, updatePhotographer, deletePhotographer } = await import("@/features/photographers/actions")
const { listPhotographers, getPhotographer } = await import("@/features/photographers/queries")

const PASSWORD = "correct-horse-battery"
let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers
let disciplineA: string
let disciplineB: string

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

const valid = (key: string, extra: Record<string, unknown> = {}) => ({ name: `${P}${key}`, slug: `${P}${key}`, ...extra })

async function create(key: string, extra: Record<string, unknown> = {}) {
  const result = await createPhotographer(valid(key, extra))
  if (!result.ok) throw new Error(`fixture failed: ${result.error.message}`)
  return result.data.id
}

const assignedDisciplineIds = async (providerId: string) =>
  (await db.serviceProviderDiscipline.findMany({ where: { providerId } })).map((row) => row.disciplineId).sort()

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await seedProviderTypes(db) // idempotent; the real "photographer" type is shared test-database catalog data
  await createUserWithPassword({ email: `${P}ph-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}ph-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("ph-admin")
  userHeaders = await signIn("ph-user")
  const first = await createSeries(db, "ph-a")
  const second = await createSeries(db, "ph-b")
  disciplineA = first.disciplineId
  disciplineB = second.disciplineId
})

beforeEach(async () => {
  const provider = { provider: { slug: { startsWith: P } } }
  await db.serviceProviderToType.deleteMany({ where: provider })
  await db.serviceProviderDiscipline.deleteMany({ where: provider })
  await db.serviceProviderMedia.deleteMany({ where: provider })
  await db.eventServiceProvider.deleteMany({ where: provider })
  await db.serviceProvider.deleteMany({ where: { slug: { startsWith: P } } })
  currentHeaders = adminHeaders
  slugAlwaysFree = false
})

afterEach(() => vi.restoreAllMocks())

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
        await createPhotographer(valid("auth-new")),
        await updatePhotographer(id, valid("auth", { name: "Changed" })),
        await deletePhotographer(id),
      ]) {
        expect(result).toMatchObject({ ok: false, error: { code } })
      }
    }
    expect(await db.serviceProvider.count({ where: { slug: `${P}auth-new` } })).toBe(0)
    expect(await db.serviceProvider.findUniqueOrThrow({ where: { slug: `${P}auth` } })).toMatchObject({ name: `${P}auth`, deletedAt: null })
  })
})

describe("create", () => {
  it("creates an Instagram-only photographer classified by the photographer type", async () => {
    const id = await create("insta", { instagram: "https://instagram.com/ItestInsta" })
    const row = await db.serviceProvider.findUniqueOrThrow({ where: { id }, include: { providerTypes: { include: { type: true } } } })
    expect(row).toMatchObject({ instagram: "itestinsta", website: null, email: null, phone: null })
    expect(row.providerTypes.map((link) => link.type.slug)).toEqual(["photographer"])
  })

  it("stores the full profile with normalized values and several disciplines", async () => {
    const id = await create("full", {
      name: `  ${P}full   studio `,
      description: " Bio ",
      website: "https://example.com",
      email: "Studio@Example.com",
      phone: "+58 412 1234567",
      profileImageUrl: "https://example.com/me.jpg",
      city: "Caracas",
      countryCode: "ve",
      disciplineIds: [disciplineA, disciplineB],
    })
    expect(await db.serviceProvider.findUniqueOrThrow({ where: { id } })).toMatchObject({
      name: `${P}full studio`,
      description: "Bio",
      website: "https://example.com/",
      email: "studio@example.com",
      city: "Caracas",
      countryCode: "VE",
    })
    expect(await assignedDisciplineIds(id)).toEqual([disciplineA, disciplineB].sort())
  })

  it("derives a slug and gives a same-named photographer a numeric suffix instead of an error", async () => {
    expect(await createPhotographer({ name: `${P}Same Name` })).toMatchObject({ ok: true })
    expect(await createPhotographer({ name: `${P}Same Name` })).toMatchObject({ ok: true })
    const slugs = (await db.serviceProvider.findMany({ where: { name: `${P}Same Name` } })).map((row) => row.slug).sort()
    expect(slugs).toEqual([`${P.toLowerCase()}same-name`, `${P.toLowerCase()}same-name-2`])
  })

  it("returns field errors for invalid input", async () => {
    const result = await createPhotographer({ name: "", website: "javascript:x", email: "bad" })
    expect(result).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(result.ok === false && Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual(["email", "name", "website"])
  })

  it("rejects unknown and soft-deleted disciplines", async () => {
    const unknown = "6f1c0a52-1d7e-4c8f-9a3b-2b1d5e7f9a10"
    expect(await createPhotographer(valid("bad-d", { disciplineIds: [unknown] }))).toMatchObject({ ok: false, error: { code: "validation" } })
    await db.discipline.update({ where: { id: disciplineB }, data: { deletedAt: new Date() } })
    try {
      expect(await createPhotographer(valid("bad-d", { disciplineIds: [disciplineB] }))).toMatchObject({ ok: false, error: { code: "validation" } })
    } finally {
      await db.discipline.update({ where: { id: disciplineB }, data: { deletedAt: null } })
    }
    expect(await db.serviceProvider.count({ where: { slug: `${P}bad-d` } })).toBe(0)
  })

  it("rejects an explicit slug that is in use or reserved by a deleted profile", async () => {
    const id = await create("slug")
    expect(await createPhotographer(valid("slug", { name: "Other" }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    await deletePhotographer(id)
    const reserved = await createPhotographer(valid("slug", { name: "Other" }))
    expect(reserved).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { slug: ["Reserved by a deleted provider."] } } })
  })

  it("maps a lost slug race (P2002) to a conflict and leaves no partial rows", async () => {
    await create("race")
    slugAlwaysFree = true
    expect(await createPhotographer(valid("race", { name: `${P}race-2`, disciplineIds: [disciplineA] }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(await db.serviceProvider.count({ where: { name: `${P}race-2` } })).toBe(0)
    expect(await db.serviceProviderDiscipline.count({ where: { disciplineId: disciplineA, provider: { slug: { startsWith: P } } } })).toBe(0)
  })

  it("rolls back when a discipline stops being active between validation and the write", async () => {
    // The pre-check passes (mocked), but the in-transaction share lock sees the discipline as deleted.
    vi.spyOn(prisma.discipline, "count").mockResolvedValue(1)
    await db.discipline.update({ where: { id: disciplineB }, data: { deletedAt: new Date() } })
    try {
      expect(await createPhotographer(valid("gone", { disciplineIds: [disciplineB] }))).toMatchObject({ ok: false, error: { code: "conflict" } })
    } finally {
      await db.discipline.update({ where: { id: disciplineB }, data: { deletedAt: null } })
    }
    expect(await db.serviceProvider.count({ where: { slug: `${P}gone` } })).toBe(0)
  })
})

describe("duplicate detection", () => {
  it("rejects a repeated Instagram handle, website or email, but not a repeated name", async () => {
    await create("dup", { instagram: "itestdup", website: "https://dup.example.com", email: "dup@example.com" })
    for (const [field, value] of [["instagram", "@ItestDup"], ["website", "https://dup.example.com"], ["email", "DUP@example.com"]] as const) {
      const result = await createPhotographer({ name: `${P}other-${field}`, [field]: value })
      expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { [field]: ["Already used by another profile."] } } })
    }
    expect(await createPhotographer({ name: `${P}dup`, slug: `${P}dup-twin` })).toMatchObject({ ok: true })
  })

  it("ignores deleted profiles and the profile being edited", async () => {
    const id = await create("dup-del", { instagram: "itestdupdel" })
    expect(await updatePhotographer(id, valid("dup-del", { instagram: "itestdupdel", description: "same profile" }))).toMatchObject({ ok: true })
    await deletePhotographer(id)
    expect(await createPhotographer({ name: `${P}dup-reuse`, instagram: "itestdupdel" })).toMatchObject({ ok: true })
  })
})

describe("update", () => {
  it("updates fields, clears optional contacts and keeps unrelated data", async () => {
    const id = await create("upd", { instagram: "itestupd", website: "https://upd.example.com", disciplineIds: [disciplineA] })
    const otherType = await db.serviceProviderType.create({ data: { name: "Itest type", slug: `${P}type` } })
    await db.serviceProvider.update({ where: { id }, data: { metadata: { keep: true }, providerTypes: { create: { typeId: otherType.id } } } })
    const media = await db.media.create({ data: { url: `https://example.com/${P}upd.jpg`, type: "IMAGE" } })
    await db.serviceProviderMedia.create({ data: { providerId: id, mediaId: media.id, type: "PORTFOLIO" } })
    try {
      const result = await updatePhotographer(id, valid("upd", { name: `${P}upd-renamed`, instagram: "itestupd", disciplineIds: [disciplineA] }))
      expect(result).toMatchObject({ ok: true })
      const row = await db.serviceProvider.findUniqueOrThrow({ where: { id }, include: { providerTypes: { include: { type: true } }, media: true } })
      expect(row).toMatchObject({ name: `${P}upd-renamed`, website: null, metadata: { keep: true } })
      expect(row.providerTypes.map((link) => link.type.slug).sort()).toEqual([`${P}type`, "photographer"])
      expect(row.media).toHaveLength(1)
    } finally {
      await db.serviceProviderMedia.deleteMany({ where: { providerId: id } })
      await db.media.delete({ where: { id: media.id } })
    }
  })

  it("keeps the current slug when the slug field is empty", async () => {
    const id = await create("keep-slug")
    expect(await updatePhotographer(id, { name: `${P}new name`, slug: "" })).toMatchObject({ ok: true })
    expect((await db.serviceProvider.findUniqueOrThrow({ where: { id } })).slug).toBe(`${P}keep-slug`)
  })

  it("adds, removes and keeps discipline assignments without recreating untouched rows", async () => {
    const id = await create("disc", { disciplineIds: [disciplineA] })
    const before = await db.serviceProviderDiscipline.findUniqueOrThrow({ where: { providerId_disciplineId: { providerId: id, disciplineId: disciplineA } } })
    expect(await updatePhotographer(id, valid("disc", { disciplineIds: [disciplineA, disciplineB] }))).toMatchObject({ ok: true })
    expect(await assignedDisciplineIds(id)).toEqual([disciplineA, disciplineB].sort())
    const kept = await db.serviceProviderDiscipline.findUniqueOrThrow({ where: { providerId_disciplineId: { providerId: id, disciplineId: disciplineA } } })
    expect(kept.id).toBe(before.id)
    expect(await updatePhotographer(id, valid("disc", { disciplineIds: [disciplineB] }))).toMatchObject({ ok: true })
    expect(await assignedDisciplineIds(id)).toEqual([disciplineB])
    expect(await updatePhotographer(id, valid("disc"))).toMatchObject({ ok: true })
    expect(await assignedDisciplineIds(id)).toEqual([])
  })

  it("leaves everything unchanged when the update loses a slug race", async () => {
    const id = await create("upd-race", { disciplineIds: [disciplineA] })
    await create("upd-race-other")
    slugAlwaysFree = true
    const result = await updatePhotographer(id, valid("upd-race-other", { name: "Changed", disciplineIds: [disciplineB] }))
    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.serviceProvider.findUniqueOrThrow({ where: { id } })).name).toBe(`${P}upd-race`)
    expect(await assignedDisciplineIds(id)).toEqual([disciplineA])
  })

  it("returns not_found for unknown, deleted and non-photographer providers", async () => {
    const deleted = await create("upd-del")
    await deletePhotographer(deleted)
    const unclassified = await db.serviceProvider.create({ data: { name: `${P}no-type`, slug: `${P}no-type` } })
    for (const id of ["not-a-uuid", "6f1c0a52-1d7e-4c8f-9a3b-2b1d5e7f9a10", deleted, unclassified.id]) {
      expect(await updatePhotographer(id, valid("x"))).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })
})

describe("soft deletion", () => {
  it("soft-deletes, hides from reads and keeps rows, relations and the slug reservation", async () => {
    const id = await create("del", { disciplineIds: [disciplineA] })
    expect(await deletePhotographer(id)).toMatchObject({ ok: true })
    expect((await db.serviceProvider.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
    expect(await assignedDisciplineIds(id)).toEqual([disciplineA])
    expect(await getPhotographer(id)).toBeNull()
    expect(await deletePhotographer(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  async function assign(providerId: string, key: string, editionData: Record<string, unknown> = {}) {
    const series = await createSeries(db, key)
    const edition = await db.eventEdition.create({ data: { eventSeriesId: series.id, year: 2031, name: `${P}${key}`, slug: `${P}${key}-ed`, ...editionData } })
    return db.eventServiceProvider.create({ data: { eventEditionId: edition.id, providerId, role: "PHOTOGRAPHER" } })
  }

  it("deletes when it has no active assignments, keeping historical ones untouched", async () => {
    const id = await create("del-hist")
    const withDeletedEdition = await assign(id, "del-h1", { deletedAt: new Date() })
    const deletedAssignment = await assign(id, "del-h2")
    await db.eventServiceProvider.update({ where: { id: deletedAssignment.id }, data: { deletedAt: new Date() } })
    expect(await deletePhotographer(id)).toMatchObject({ ok: true })
    expect(await db.eventServiceProvider.count({ where: { id: { in: [withDeletedEdition.id, deletedAssignment.id] }, providerId: id } })).toBe(2)
  })

  it("is blocked by an active edition assignment and changes nothing", async () => {
    const id = await create("del-block", { disciplineIds: [disciplineA] })
    const assignment = await assign(id, "del-b1")
    const result = await deletePhotographer(id)
    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect(result.ok === false && result.error.message).toMatch(/Unassign/)
    expect((await db.serviceProvider.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
    expect(await assignedDisciplineIds(id)).toEqual([disciplineA])
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: assignment.id } })).deletedAt).toBeNull()
    // Once the assignment is removed (soft delete, as the future admin will do), deletion succeeds.
    await db.eventServiceProvider.update({ where: { id: assignment.id }, data: { deletedAt: new Date() } })
    expect(await deletePhotographer(id)).toMatchObject({ ok: true })
  })

  it("serializes with a concurrent assignment: the delete waits for the share lock and then sees it", async () => {
    const id = await create("del-race")
    const series = await createSeries(db, "del-r")
    const edition = await db.eventEdition.create({ data: { eventSeriesId: series.id, year: 2031, name: `${P}del-r`, slug: `${P}del-r-ed` } })
    let deleteResult: Awaited<ReturnType<typeof deletePhotographer>> | undefined
    await db.$transaction(async (tx) => {
      // What a future assignment mutation must do: share-lock the provider, verify it, then insert.
      await tx.$queryRaw`SELECT id FROM service_providers WHERE id = ${id}::uuid AND deleted_at IS NULL FOR SHARE`
      const pendingDelete = deletePhotographer(id).then((result) => (deleteResult = result))
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(deleteResult).toBeUndefined() // blocked behind the share lock
      await tx.eventServiceProvider.create({ data: { eventEditionId: edition.id, providerId: id, role: "PHOTOGRAPHER" } })
      void pendingDelete
    })
    await vi.waitFor(() => expect(deleteResult).toBeDefined())
    expect(deleteResult).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.serviceProvider.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
  })
})

describe("queries", () => {
  it("lists only non-deleted photographers, not other provider types", async () => {
    await create("list-a")
    const deleted = await create("list-b")
    await deletePhotographer(deleted)
    await db.serviceProvider.create({ data: { name: `${P}list-c`, slug: `${P}list-c` } })
    const { items, total } = await listPhotographers({ q: `${P}list` })
    expect(items.map((item) => item.slug)).toEqual([`${P}list-a`])
    expect(total).toBe(1)
  })

  it("searches by name, Instagram, website, email and city, case-insensitively", async () => {
    await create("find", { instagram: "itestuniquegram", website: "https://uniquesite.example.com", email: "unique@mail.example.com", city: "Maracaibo" })
    for (const term of ["ITEST-FIND", "uniquegram", "uniquesite", "unique@mail", "maracaibo"]) {
      expect((await listPhotographers({ q: term })).items.map((item) => item.slug)).toContain(`${P}find`)
    }
    expect((await listPhotographers({ q: "no-such-photographer-xyz" })).total).toBe(0)
  })

  it("filters by discipline and reports discipline names", async () => {
    await create("filter-a", { disciplineIds: [disciplineA] })
    await create("filter-b", { disciplineIds: [disciplineB] })
    const { items } = await listPhotographers({ q: `${P}filter`, disciplineId: disciplineA })
    expect(items.map((item) => item.slug)).toEqual([`${P}filter-a`])
    expect(items[0].disciplineNames).toHaveLength(1)
  })

  it("paginates in a stable order and clamps an out-of-range page", async () => {
    for (let index = 0; index < 23; index++) await create(`page-${String(index).padStart(2, "0")}`)
    const first = await listPhotographers({ q: `${P}page`, page: 1 })
    const second = await listPhotographers({ q: `${P}page`, page: 2 })
    expect([first.items.length, second.items.length, first.total, first.pageCount]).toEqual([20, 3, 23, 2])
    expect(first.items[0].slug).toBe(`${P}page-00`)
    expect(second.items[0].slug).toBe(`${P}page-20`)
    expect((await listPhotographers({ q: `${P}page`, page: 99 })).page).toBe(2)
  })
})
