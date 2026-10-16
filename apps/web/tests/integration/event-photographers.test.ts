import type { Prisma, PrismaClient } from "@prisma/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { seedProviderTypes } from "../../prisma/seed/catalog"
import { auth } from "@/server/auth/auth"
import { createUserWithPassword } from "@/server/auth/provision"
import { cleanupFixtures, createEdition, createSeries, createTestClient, P } from "./helpers"

let currentHeaders = new Headers()
vi.mock("@/server/auth/session", async (importActual) => {
  const actual = await importActual<typeof import("@/server/auth/session")>()
  return { ...actual, requireAdmin: () => actual.requireAdmin(currentHeaders) }
})
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { addEventPhotographer, updateEventPhotographer, removeEventPhotographer, searchEditionPhotographerCandidates } = await import(
  "@/features/event-photographers/actions"
)
const { listEditionPhotographers } = await import("@/features/event-photographers/queries")
const { deletePhotographer } = await import("@/features/photographers/actions")
const { deleteEventEdition } = await import("@/features/event-editions/actions")

const PASSWORD = "correct-horse-battery"
const KEY = "ep-"
const randomUuid = "99999999-9999-4999-8999-999999999999"

let db: PrismaClient
let adminHeaders: Headers
let userHeaders: Headers
let seriesId: string
let photographerTypeId: string
let editionId: string
let otherEditionId: string

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function signIn(key: string) {
  const { headers } = await auth.api.signInEmail({ body: { email: `${P}${key}@example.test`, password: PASSWORD }, returnHeaders: true })
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") })
}

/** A photographer: a ServiceProvider linked to the real "photographer" type. */
async function newPhotographer(key: string, data: Partial<Prisma.ServiceProviderUncheckedCreateInput> = {}) {
  return db.serviceProvider.create({
    data: { name: `${P}${KEY}${key}`, slug: `${P}${KEY}${key}`, providerTypes: { create: { typeId: photographerTypeId } }, ...data },
  })
}

const newEdition = (key: string, data: Parameters<typeof createEdition>[3] = {}) => createEdition(db, seriesId, `${KEY}${key}`, data)

async function add(providerId: string, extra: Record<string, unknown> = {}, onEdition = editionId) {
  const result = await addEventPhotographer({ eventEditionId: onEdition, providerId, ...extra })
  if (!result.ok) throw new Error(`fixture failed: ${result.error.message}`)
  return result.data
}

const createGallery = (eventServiceProviderId: string) =>
  db.eventResource.create({
    data: {
      eventEditionId: editionId,
      eventServiceProviderId,
      title: `${P}${KEY}gallery`,
      type: "PHOTO_GALLERY",
      provider: "OTHER",
      url: `https://example.test/${P}${KEY}gallery/${eventServiceProviderId}`,
    },
  })

const rowsOf = (eventEditionId: string) => db.eventServiceProvider.findMany({ where: { eventEditionId }, orderBy: { createdAt: "asc" } })

/** Holds a transaction open (after `work`) so a competing action can be observed waiting on its locks. */
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
  await seedProviderTypes(db) // idempotent; the real "photographer" type is shared test-database catalog data
  await createUserWithPassword({ email: `${P}ep-admin@example.test`, name: "a", password: PASSWORD, role: "admin" })
  await createUserWithPassword({ email: `${P}ep-user@example.test`, name: "u", password: PASSWORD, role: "user" })
  adminHeaders = await signIn("ep-admin")
  userHeaders = await signIn("ep-user")
  photographerTypeId = (await db.serviceProviderType.findUniqueOrThrow({ where: { slug: "photographer" } })).id
  seriesId = (await createSeries(db, "ep")).id
  editionId = (await newEdition("main")).id
  otherEditionId = (await newEdition("other", { year: 2031 })).id
})

beforeEach(async () => {
  currentHeaders = adminHeaders
  // Assignments and photographers are per test; editions are shared fixtures.
  await db.eventResource.deleteMany({ where: { title: { startsWith: `${P}${KEY}` } } })
  await db.eventServiceProvider.deleteMany({ where: { OR: [{ provider: { slug: { startsWith: `${P}${KEY}` } } }, { eventEdition: { slug: { startsWith: `${P}${KEY}` } } }] } })
  await db.serviceProviderToType.deleteMany({ where: { provider: { slug: { startsWith: `${P}${KEY}` } } } })
  await db.serviceProvider.deleteMany({ where: { slug: { startsWith: `${P}${KEY}` } } })
  await db.eventEdition.updateMany({ where: { id: { in: [editionId, otherEditionId] } }, data: { deletedAt: null } })
})

afterEach(() => vi.restoreAllMocks())

afterAll(async () => {
  if (!db) return
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("authorization", () => {
  it("rejects unauthenticated and non-admin callers on every operation without touching data", async () => {
    const photographer = await newPhotographer("auth")
    const second = await newPhotographer("auth-2")
    const { id } = await add(photographer.id, { accreditation: "OFFICIAL", description: "keep" })
    for (const [headers, code] of [[new Headers(), "unauthorized"], [userHeaders, "forbidden"]] as const) {
      currentHeaders = headers
      for (const result of [
        await addEventPhotographer({ eventEditionId: editionId, providerId: second.id }),
        await updateEventPhotographer(id, { accreditation: "INDEPENDENT", description: "changed" }),
        await removeEventPhotographer(id),
        await searchEditionPhotographerCandidates({ eventEditionId: editionId, q: "" }),
      ]) {
        expect(result).toMatchObject({ ok: false, error: { code } })
      }
    }
    const rows = await rowsOf(editionId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id, accreditation: "OFFICIAL", description: "keep", deletedAt: null })
  })
})

describe("adding photographers", () => {
  it("creates an independent assignment with the PHOTOGRAPHER role", async () => {
    const photographer = await newPhotographer("independent")
    const { id, restored } = await add(photographer.id, { accreditation: "INDEPENDENT", description: "  Finish   line " })
    expect(restored).toBe(false)
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).toMatchObject({
      eventEditionId: editionId,
      providerId: photographer.id,
      role: "PHOTOGRAPHER",
      accreditation: "INDEPENDENT",
      description: "Finish line",
      deletedAt: null,
    })
  })

  it("creates an official assignment, and defaults to an unspecified accreditation", async () => {
    const official = await newPhotographer("official")
    const unspecified = await newPhotographer("unspecified")
    const officialId = (await add(official.id, { accreditation: "OFFICIAL" })).id
    const unspecifiedId = (await add(unspecified.id)).id
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: officialId } })).accreditation).toBe("OFFICIAL")
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id: unspecifiedId } })).toMatchObject({ accreditation: "UNKNOWN", description: null })
  })

  it("allows several photographers, official and independent together, and a photographer without Instagram", async () => {
    const withInstagram = await newPhotographer("multi-a", { instagram: "multi.a" })
    const withoutInstagram = await newPhotographer("multi-b")
    await add(withInstagram.id, { accreditation: "OFFICIAL" })
    await add(withoutInstagram.id, { accreditation: "INDEPENDENT" })
    const listed = await listEditionPhotographers(editionId)
    expect(listed.map((row) => [row.photographer.name, row.accreditation])).toEqual([
      [`${P}${KEY}multi-a`, "OFFICIAL"],
      [`${P}${KEY}multi-b`, "INDEPENDENT"],
    ])
    expect(listed[1].photographer.instagram).toBeNull()
  })

  it("allows an edition with no photographers and one with no organizers or galleries", async () => {
    expect(await listEditionPhotographers(editionId)).toEqual([])
    const photographer = await newPhotographer("bare")
    await add(photographer.id)
    expect(await db.eventEditionOrganizer.count({ where: { eventEditionId: editionId } })).toBe(0)
    expect(await db.eventResource.count({ where: { eventEditionId: editionId } })).toBe(0)
  })

  it("lets one photographer cover several editions, including editions of the same series and historical ones", async () => {
    const photographer = await newPhotographer("traveller")
    const historical = await newEdition("hist", { year: 2018, status: "COMPLETED", startsOn: new Date("2018-05-05T00:00:00.000Z") })
    await add(photographer.id, { accreditation: "OFFICIAL" }, editionId)
    await add(photographer.id, { accreditation: "INDEPENDENT" }, otherEditionId)
    await add(photographer.id, { accreditation: "UNKNOWN" }, historical.id)
    const assignments = await db.eventServiceProvider.findMany({ where: { providerId: photographer.id }, orderBy: { createdAt: "asc" } })
    expect(assignments.map((row) => row.accreditation)).toEqual(["OFFICIAL", "INDEPENDENT", "UNKNOWN"])
    expect(new Set(assignments.map((row) => row.eventEditionId)).size).toBe(3)
  })

  it("rejects a duplicate active assignment with a conflict and keeps the existing row", async () => {
    const photographer = await newPhotographer("dup")
    const { id } = await add(photographer.id, { accreditation: "OFFICIAL" })
    const result = await addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, accreditation: "INDEPENDENT" })
    expect(result).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { providerId: expect.any(Array) } } })
    const rows = await rowsOf(editionId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id, accreditation: "OFFICIAL" })
  })

  it("returns field errors for invalid input", async () => {
    const photographer = await newPhotographer("invalid")
    expect(await addEventPhotographer({})).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await addEventPhotographer({ eventEditionId: editionId, providerId: "nope" })).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { providerId: expect.any(Array) } } })
    expect(await addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, accreditation: "VIP" })).toMatchObject({
      ok: false,
      error: { code: "validation", fieldErrors: { accreditation: expect.any(Array) } },
    })
    expect(await addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, description: "x".repeat(501) })).toMatchObject({
      ok: false,
      error: { fieldErrors: { description: expect.any(Array) } },
    })
    expect(await rowsOf(editionId)).toHaveLength(0)
  })

  it("rejects unknown, deleted and non-photographer providers", async () => {
    const deleted = await newPhotographer("gone", { deletedAt: new Date() })
    const otherType = await db.serviceProviderType.create({ data: { name: `${P}${KEY}type`, slug: `${P}${KEY}type` } })
    const videographer = await db.serviceProvider.create({
      data: { name: `${P}${KEY}video`, slug: `${P}${KEY}video`, providerTypes: { create: { typeId: otherType.id } } },
    })
    const untyped = await db.serviceProvider.create({ data: { name: `${P}${KEY}untyped`, slug: `${P}${KEY}untyped` } })
    for (const providerId of [randomUuid, deleted.id, videographer.id, untyped.id]) {
      expect(await addEventPhotographer({ eventEditionId: editionId, providerId })).toMatchObject({
        ok: false,
        error: { code: "validation", fieldErrors: { providerId: expect.any(Array) } },
      })
    }
    expect(await rowsOf(editionId)).toHaveLength(0)
    await db.serviceProviderToType.deleteMany({ where: { typeId: otherType.id } })
    await db.serviceProvider.deleteMany({ where: { id: videographer.id } })
    await db.serviceProviderType.delete({ where: { id: otherType.id } })
  })

  it("rejects unknown and deleted editions", async () => {
    const photographer = await newPhotographer("bad-edition")
    const deletedEdition = await newEdition("deleted-ed", { deletedAt: new Date() })
    for (const eventEditionId of [randomUuid, deletedEdition.id]) {
      expect(await addEventPhotographer({ eventEditionId, providerId: photographer.id })).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
    expect(await db.eventServiceProvider.count({ where: { providerId: photographer.id } })).toBe(0)
  })

  it("does not treat another role of the same provider as a duplicate and never lists or touches it", async () => {
    const photographer = await newPhotographer("two-roles")
    const videoRow = await db.eventServiceProvider.create({
      data: { eventEditionId: editionId, providerId: photographer.id, role: "VIDEOGRAPHER", accreditation: "OFFICIAL" },
    })
    const { id } = await add(photographer.id, { accreditation: "INDEPENDENT" })
    expect(id).not.toBe(videoRow.id)
    expect((await listEditionPhotographers(editionId)).map((row) => row.id)).toEqual([id])
    expect(await removeEventPhotographer(videoRow.id)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await updateEventPhotographer(videoRow.id, { accreditation: "UNKNOWN" })).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id: videoRow.id } })).toMatchObject({ accreditation: "OFFICIAL", deletedAt: null })
  })
})

describe("updating an assignment", () => {
  it("changes accreditation and note and keeps identity, other assignments and the profile", async () => {
    const photographer = await newPhotographer("update", { instagram: "update.me" })
    const neighbour = await newPhotographer("update-neighbour")
    const { id } = await add(photographer.id, { accreditation: "INDEPENDENT", description: "before" })
    const neighbourId = (await add(neighbour.id, { accreditation: "OFFICIAL" })).id
    const before = await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })

    expect(await updateEventPhotographer(id, { accreditation: "OFFICIAL", description: "after" })).toMatchObject({ ok: true })
    const after = await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })
    expect(after).toMatchObject({ accreditation: "OFFICIAL", description: "after", providerId: photographer.id, eventEditionId: editionId, role: "PHOTOGRAPHER" })
    expect(after.createdAt).toEqual(before.createdAt)
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: neighbourId } })).accreditation).toBe("OFFICIAL")
    expect(await db.serviceProvider.findUniqueOrThrow({ where: { id: photographer.id } })).toMatchObject({ name: `${P}${KEY}update`, instagram: "update.me" })

    expect(await updateEventPhotographer(id, { accreditation: "UNKNOWN", description: "" })).toMatchObject({ ok: true })
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).toMatchObject({ accreditation: "UNKNOWN", description: null })
  })

  it("ignores attempts to change the photographer, edition or role", async () => {
    const photographer = await newPhotographer("immutable")
    const intruder = await newPhotographer("immutable-2")
    const { id } = await add(photographer.id)
    await updateEventPhotographer(id, { accreditation: "OFFICIAL", providerId: intruder.id, eventEditionId: otherEditionId, role: "VIDEOGRAPHER" })
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).toMatchObject({
      providerId: photographer.id,
      eventEditionId: editionId,
      role: "PHOTOGRAPHER",
    })
  })

  it("returns validation errors and not_found without writing", async () => {
    const photographer = await newPhotographer("update-errors")
    const { id } = await add(photographer.id, { accreditation: "OFFICIAL" })
    expect(await updateEventPhotographer(id, { accreditation: "VIP" })).toMatchObject({ ok: false, error: { code: "validation" } })
    expect(await updateEventPhotographer("nope", {})).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await updateEventPhotographer(randomUuid, {})).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).accreditation).toBe("OFFICIAL")
  })

  it("does not update a removed assignment or one on a deleted edition", async () => {
    const photographer = await newPhotographer("update-gone")
    const { id } = await add(photographer.id)
    await removeEventPhotographer(id)
    expect(await updateEventPhotographer(id, { accreditation: "OFFICIAL" })).toMatchObject({ ok: false, error: { code: "not_found" } })

    const historical = await newEdition("update-hist")
    const historicalId = (await add(photographer.id, {}, historical.id)).id
    await db.eventEdition.update({ where: { id: historical.id }, data: { deletedAt: new Date() } })
    expect(await updateEventPhotographer(historicalId, { accreditation: "OFFICIAL" })).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: historicalId } })).accreditation).toBe("UNKNOWN")
  })
})

describe("removing an assignment", () => {
  it("soft-deletes only that assignment and keeps the profile, the edition and other assignments", async () => {
    const removed = await newPhotographer("remove-a")
    const kept = await newPhotographer("remove-b")
    const removedId = (await add(removed.id, { accreditation: "INDEPENDENT" })).id
    const keptId = (await add(kept.id, { accreditation: "OFFICIAL" })).id
    const elsewhereId = (await add(removed.id, { accreditation: "OFFICIAL" }, otherEditionId)).id

    expect(await removeEventPhotographer(removedId)).toMatchObject({ ok: true })

    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: removedId } })).deletedAt).not.toBeNull()
    expect((await listEditionPhotographers(editionId)).map((row) => row.id)).toEqual([keptId])
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: keptId } })).deletedAt).toBeNull()
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id: elsewhereId } })).deletedAt).toBeNull()
    expect(await db.serviceProvider.findUniqueOrThrow({ where: { id: removed.id } })).toMatchObject({ deletedAt: null })
    expect(await db.eventEdition.findUniqueOrThrow({ where: { id: editionId } })).toMatchObject({ deletedAt: null })
  })

  it("returns not_found for unknown ids and for an assignment that was already removed", async () => {
    const photographer = await newPhotographer("remove-twice")
    const { id } = await add(photographer.id)
    expect(await removeEventPhotographer("nope")).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await removeEventPhotographer(randomUuid)).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await removeEventPhotographer(id)).toMatchObject({ ok: true })
    expect(await removeEventPhotographer(id)).toMatchObject({ ok: false, error: { code: "not_found" } })
  })

  it("makes the photographer deletable again once no active assignment is left", async () => {
    const photographer = await newPhotographer("remove-then-delete")
    const { id } = await add(photographer.id)
    expect(await deletePhotographer(photographer.id)).toMatchObject({ ok: false, error: { code: "conflict" } })
    await removeEventPhotographer(id)
    expect(await deletePhotographer(photographer.id)).toMatchObject({ ok: true })
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull()
  })
})

describe("re-adding a removed photographer", () => {
  it("restores the reserved row with the new accreditation and note instead of inserting a duplicate", async () => {
    const photographer = await newPhotographer("restore")
    const { id } = await add(photographer.id, { accreditation: "INDEPENDENT", description: "first" })
    await removeEventPhotographer(id)

    const again = await add(photographer.id, { accreditation: "OFFICIAL" })
    expect(again).toEqual({ id, restored: true })
    expect(await rowsOf(editionId)).toHaveLength(1)
    expect(await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).toMatchObject({ accreditation: "OFFICIAL", description: null, deletedAt: null })
    expect((await listEditionPhotographers(editionId)).map((row) => row.id)).toEqual([id])
  })

  it("keeps galleries attached to the restored appearance", async () => {
    const photographer = await newPhotographer("restore-resource")
    const { id } = await add(photographer.id)
    const resource = await createGallery(id)
    await db.eventResource.update({ where: { id: resource.id }, data: { deletedAt: new Date() } }) // an inactive gallery does not block removal
    expect(await removeEventPhotographer(id)).toMatchObject({ ok: true })
    await add(photographer.id)
    expect((await db.eventResource.findUniqueOrThrow({ where: { id: resource.id } })).eventServiceProviderId).toBe(id)
  })

  it("is not blocked by galleries of other assignments or galleries attributed to nobody", async () => {
    const photographer = await newPhotographer("remove-unrelated-gallery")
    const neighbour = await newPhotographer("remove-unrelated-gallery-2")
    const { id } = await add(photographer.id)
    const elsewhereId = (await add(photographer.id, {}, otherEditionId)).id
    const neighbourId = (await add(neighbour.id)).id
    await createGallery(neighbourId)
    await db.eventResource.create({
      data: { eventEditionId: editionId, title: `${P}${KEY}unattributed`, type: "PHOTO_GALLERY", provider: "OTHER", url: `https://example.test/${P}${KEY}unattributed` },
    })
    await db.eventResource.create({
      data: { eventEditionId: otherEditionId, eventServiceProviderId: elsewhereId, title: `${P}${KEY}elsewhere`, type: "PHOTO_GALLERY", provider: "OTHER", url: `https://example.test/${P}${KEY}elsewhere` },
    })
    expect(await removeEventPhotographer(id)).toMatchObject({ ok: true })
    expect(await db.eventResource.count({ where: { title: { startsWith: `${P}${KEY}` }, deletedAt: null } })).toBe(3) // all resources preserved
  })

  it("refuses to remove a photographer who still has active gallery links and changes nothing", async () => {
    const photographer = await newPhotographer("remove-gallery")
    const { id } = await add(photographer.id)
    await createGallery(id)
    const result = await removeEventPhotographer(id)
    expect(result).toMatchObject({ ok: false, error: { code: "conflict" } })
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull()
  })
})

describe("listing the photographers of an edition", () => {
  it("hides removed assignments, deleted providers and other editions, ordered by name", async () => {
    const zed = await newPhotographer("list-zed")
    const alpha = await newPhotographer("list-alpha")
    const removed = await newPhotographer("list-removed")
    const orphan = await newPhotographer("list-orphan")
    const elsewhere = await newPhotographer("list-elsewhere")
    await add(zed.id)
    await add(alpha.id)
    await removeEventPhotographer((await add(removed.id)).id)
    await add(orphan.id)
    await add(elsewhere.id, {}, otherEditionId)
    // Defensive: a deleted provider's leftover assignment is not shown either.
    await db.serviceProvider.update({ where: { id: orphan.id }, data: { deletedAt: new Date() } })

    expect((await listEditionPhotographers(editionId)).map((row) => row.photographer.name)).toEqual([`${P}${KEY}list-alpha`, `${P}${KEY}list-zed`])
    expect(await listEditionPhotographers("not-a-uuid")).toEqual([])
  })
})

describe("searching candidate photographers", () => {
  const search = async (q: string, page = 1) => {
    const result = await searchEditionPhotographerCandidates({ eventEditionId: editionId, q, page })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  }
  const names = (items: { name: string }[]) => items.map((item) => item.name.replace(`${P}${KEY}`, ""))

  it("matches part of a name or an Instagram handle, ignoring case and a leading @", async () => {
    await newPhotographer("find-ana", { name: `${P}${KEY}Ana Pérez`, instagram: "ana.lens" })
    await newPhotographer("find-luis", { name: `${P}${KEY}Luis Mora`, instagram: "studio.mora" })
    expect(names((await search("ana p")).items)).toEqual(["Ana Pérez"])
    expect(names((await search("@STUDIO.mora")).items)).toEqual(["Luis Mora"])
    expect(names((await search(`${KEY}find`)).items)).toEqual([])
    expect((await search("ep-")).total).toBeGreaterThanOrEqual(0)
  })

  it("lists only active photographers: no deleted profiles and no other provider types", async () => {
    await newPhotographer("scope-active")
    await newPhotographer("scope-deleted", { deletedAt: new Date() })
    await db.serviceProvider.create({ data: { name: `${P}${KEY}scope-untyped`, slug: `${P}${KEY}scope-untyped` } })
    expect(names((await search(`${KEY}scope`)).items)).toEqual(["scope-active"])
  })

  it("includes photographers without Instagram", async () => {
    await newPhotographer("noig")
    const [item] = (await search(`${KEY}noig`)).items
    expect(item).toMatchObject({ name: `${P}${KEY}noig`, instagram: null })
  })

  it("flags active assignments of this edition only, not removed ones or those of other editions", async () => {
    const assigned = await newPhotographer("flag-assigned")
    const removed = await newPhotographer("flag-removed")
    const elsewhere = await newPhotographer("flag-elsewhere")
    await add(assigned.id)
    await removeEventPhotographer((await add(removed.id)).id)
    await add(elsewhere.id, {}, otherEditionId)
    const flags = Object.fromEntries((await search(`${KEY}flag`)).items.map((item) => [item.name.replace(`${P}${KEY}`, ""), item.alreadyAssigned]))
    expect(flags).toEqual({ "flag-assigned": true, "flag-removed": false, "flag-elsewhere": false })
  })

  it("tells same-named photographers apart by Instagram, place and slug", async () => {
    await newPhotographer("twin-1", { name: `${P}${KEY}Twin`, instagram: "twin.one", city: "Caracas", countryCode: "VE" })
    await newPhotographer("twin-2", { name: `${P}${KEY}Twin`, instagram: null, city: "Mérida", countryCode: "VE" })
    const { items } = await search(`${KEY}Twin`)
    expect(items).toHaveLength(2)
    expect(new Set(items.map((item) => item.slug)).size).toBe(2)
    expect(items.map((item) => item.instagram).sort()).toEqual([null, "twin.one"])
    expect(items.map((item) => item.city).sort()).toEqual(["Caracas", "Mérida"])
  })

  it("pages through every match instead of truncating to a small limit", async () => {
    for (let index = 10; index < 35; index++) await newPhotographer(`page-${index}`)
    const first = await search(`${KEY}page-`)
    expect(first).toMatchObject({ total: 25, page: 1, hasMore: true })
    expect(first.items).toHaveLength(20)
    const second = await search(`${KEY}page-`, 2)
    expect(second).toMatchObject({ total: 25, page: 2, hasMore: false })
    expect(second.items).toHaveLength(5)
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(25)
  })

  it("returns not_found for an unknown, invalid or deleted edition", async () => {
    const deletedEdition = await newEdition("search-deleted", { deletedAt: new Date() })
    for (const eventEditionId of [randomUuid, "nope", deletedEdition.id]) {
      expect(await searchEditionPhotographerCandidates({ eventEditionId, q: "" })).toMatchObject({ ok: false, error: { code: "not_found" } })
    }
  })
})

describe("concurrency", () => {
  it("lets exactly one of two simultaneous additions of the same photographer win", async () => {
    const photographer = await newPhotographer("race-same")
    const results = await Promise.all([
      addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, accreditation: "OFFICIAL" }),
      addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, accreditation: "INDEPENDENT" }),
    ])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.find((result) => !result.ok)).toMatchObject({ error: { code: "conflict" } })
    expect(await rowsOf(editionId)).toHaveLength(1)
  })

  it("maps a lost race on the unique key (P2002) to a conflict and leaves only the winner's row", async () => {
    const photographer = await newPhotographer("race-p2002")
    const rival = await holdTransaction(async (tx) => {
      await tx.eventServiceProvider.create({ data: { eventEditionId: editionId, providerId: photographer.id, role: "PHOTOGRAPHER", accreditation: "OFFICIAL" } })
    })
    const pending = addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id, accreditation: "INDEPENDENT" })
    await sleep(500) // the action reaches the blocked unique-index write
    await rival.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "conflict", fieldErrors: { providerId: expect.any(Array) } } })
    const rows = await rowsOf(editionId)
    expect(rows).toHaveLength(1)
    expect(rows[0].accreditation).toBe("OFFICIAL")
    // The failed transaction released its locks: other additions still work.
    const other = await newPhotographer("race-p2002-other")
    expect(await addEventPhotographer({ eventEditionId: editionId, providerId: other.id })).toMatchObject({ ok: true })
  })

  it("does not assign a photographer who is deleted concurrently", async () => {
    const photographer = await newPhotographer("race-delete")
    const profileDelete = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM service_providers WHERE id = ${photographer.id}::uuid FOR UPDATE`
      await tx.serviceProvider.update({ where: { id: photographer.id }, data: { deletedAt: new Date() } })
    })
    const pending = addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id })
    expect(await staysBlocked(pending)).toBe(true)
    await profileDelete.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { providerId: expect.any(Array) } } })
    expect(await rowsOf(editionId)).toHaveLength(0)
  })

  it("never leaves an active assignment on a photographer deleted at the same time", async () => {
    const photographer = await newPhotographer("race-both")
    const [added, deleted] = await Promise.all([addEventPhotographer({ eventEditionId: editionId, providerId: photographer.id }), deletePhotographer(photographer.id)])
    expect(added.ok !== deleted.ok).toBe(true) // exactly one of them wins
    const profile = await db.serviceProvider.findUniqueOrThrow({ where: { id: photographer.id } })
    const activeAssignments = await db.eventServiceProvider.count({ where: { providerId: photographer.id, deletedAt: null } })
    expect(profile.deletedAt !== null && activeAssignments > 0).toBe(false)
  })

  it("does not assign to an edition that is deleted concurrently", async () => {
    const photographer = await newPhotographer("race-edition")
    const edition = await newEdition("race-edition")
    const editionDelete = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_editions WHERE id = ${edition.id}::uuid FOR UPDATE`
      await tx.eventEdition.update({ where: { id: edition.id }, data: { deletedAt: new Date() } })
    })
    const pending = addEventPhotographer({ eventEditionId: edition.id, providerId: photographer.id })
    expect(await staysBlocked(pending)).toBe(true)
    await editionDelete.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect(await rowsOf(edition.id)).toHaveLength(0)
  })

  it("never leaves an active assignment under an edition deleted at the same time", async () => {
    const photographer = await newPhotographer("race-edition-both")
    const edition = await newEdition("race-edition-both")
    const [added, deleted] = await Promise.all([addEventPhotographer({ eventEditionId: edition.id, providerId: photographer.id }), deleteEventEdition(edition.id)])
    expect(added.ok !== deleted.ok).toBe(true)
    const stored = await db.eventEdition.findUniqueOrThrow({ where: { id: edition.id } })
    const activeAssignments = await db.eventServiceProvider.count({ where: { eventEditionId: edition.id, deletedAt: null } })
    expect(stored.deletedAt !== null && activeAssignments > 0).toBe(false)
  })

  it("serializes an update with a concurrent removal of the same assignment", async () => {
    const photographer = await newPhotographer("race-update")
    const { id } = await add(photographer.id, { accreditation: "OFFICIAL" })
    const removal = await holdTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event_service_providers WHERE id = ${id}::uuid FOR UPDATE`
      await tx.eventServiceProvider.update({ where: { id }, data: { deletedAt: new Date() } })
    })
    const pending = updateEventPhotographer(id, { accreditation: "INDEPENDENT" })
    expect(await staysBlocked(pending)).toBe(true)
    await removal.commit()
    expect(await pending).toMatchObject({ ok: false, error: { code: "not_found" } })
    expect((await db.eventServiceProvider.findUniqueOrThrow({ where: { id } })).accreditation).toBe("OFFICIAL")
  })

  it("lets additions of different photographers to the same edition run in parallel", async () => {
    const first = await newPhotographer("parallel-1")
    const second = await newPhotographer("parallel-2")
    const results = await Promise.all([
      addEventPhotographer({ eventEditionId: editionId, providerId: first.id }),
      addEventPhotographer({ eventEditionId: editionId, providerId: second.id }),
    ])
    expect(results.every((result) => result.ok)).toBe(true)
    expect(await rowsOf(editionId)).toHaveLength(2)
  })
})
