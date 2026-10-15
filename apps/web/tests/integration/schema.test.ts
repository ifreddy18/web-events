import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  assertConnectedToTestDatabase,
  cleanupFixtures,
  createEdition,
  createOrganizer,
  createProvider,
  createSeries,
  createTestClient,
  P,
} from "./helpers"

let db: PrismaClient
let seriesId: string

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db) // leftovers from an interrupted run
  seriesId = (await createSeries(db, "s1")).id
})

afterAll(async () => {
  if (!db) return
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("connection", () => {
  it("connects to events_test", async () => {
    await expect(assertConnectedToTestDatabase(db)).resolves.toBeUndefined()
  })

  it("the app singleton connects using the same guarded URL", async () => {
    const { prisma } = await import("@/server/db/prisma")
    const [row] = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`
    expect(row.current_database).toBe("events_test")
    await prisma.$disconnect()
  })
})

describe("EventSeries editions", () => {
  it("allows multiple editions in the same year", async () => {
    await createEdition(db, seriesId, "spring", { label: "Primavera" })
    await createEdition(db, seriesId, "autumn", { label: "Otoño" })
    const count = await db.eventEdition.count({ where: { eventSeriesId: seriesId, year: 2030 } })
    expect(count).toBe(2)
  })
})

describe("EventEditionOrganizer", () => {
  it("allows several organizers with only one PRIMARY", async () => {
    const edition = await createEdition(db, seriesId, "orgs")
    const [a, b, c] = await Promise.all(["org-a", "org-b", "org-c"].map((k) => createOrganizer(db, k)))
    const link = (organizerId: string, role: "PRIMARY" | "CO_ORGANIZER") =>
      db.eventEditionOrganizer.create({ data: { eventEditionId: edition.id, organizerId, role } })

    await link(a.id, "PRIMARY")
    await link(b.id, "CO_ORGANIZER")
    await expect(link(c.id, "PRIMARY")).rejects.toThrow()
    await link(c.id, "CO_ORGANIZER")

    const rows = await db.eventEditionOrganizer.findMany({ where: { eventEditionId: edition.id } })
    expect(rows).toHaveLength(3)
    expect(rows.filter((r) => r.role === "PRIMARY")).toHaveLength(1)
  })
})

describe("EventEdition CHECK constraints", () => {
  it("accepts valid dates and times", async () => {
    await expect(
      createEdition(db, seriesId, "valid", {
        startsOn: d("2030-05-10"),
        endsOn: d("2030-05-10"),
        startTime: "06:00",
        endTime: "12:30",
      }),
    ).resolves.toBeDefined()
  })

  it.each([
    ["ends before it starts", { startsOn: d("2030-05-10"), endsOn: d("2030-05-09") }],
    ["end date without start date", { endsOn: d("2030-05-10") }],
    ["time without start date", { startTime: "06:00" }],
    ["malformed start time", { startsOn: d("2030-05-10"), startTime: "25:00" }],
    ["malformed end time", { startsOn: d("2030-05-10"), endTime: "9:00" }],
    ["same-day end before start", { startsOn: d("2030-05-10"), startTime: "10:00", endTime: "09:00" }],
    [
      "registration closes before it opens",
      { registrationOpenAt: new Date("2030-04-02T00:00:00Z"), registrationCloseAt: new Date("2030-04-01T00:00:00Z") },
    ],
  ])("rejects %s", async (name, data) => {
    await expect(createEdition(db, seriesId, `bad-${name.replace(/\W+/g, "-")}`, data)).rejects.toThrow(
      /check constraint/i,
    )
  })
})

describe("EventResource", () => {
  async function editionWithProvider(key: string) {
    const edition = await createEdition(db, seriesId, `res-${key}`)
    const provider = await createProvider(db, `photog-${key}`)
    const assignment = await db.eventServiceProvider.create({
      data: { eventEditionId: edition.id, providerId: provider.id, role: "PHOTOGRAPHER" },
    })
    return { edition, provider, assignment }
  }

  const gallery = (eventEditionId: string, url: string, eventServiceProviderId?: string) => ({
    data: {
      title: `${P}gallery`,
      type: "PHOTO_GALLERY" as const,
      provider: "GOOGLE_DRIVE" as const,
      url,
      eventEditionId,
      eventServiceProviderId,
    },
  })

  it("rejects attribution to a provider assignment from another edition", async () => {
    const one = await editionWithProvider("fk-1")
    const two = await editionWithProvider("fk-2")
    await expect(
      db.eventResource.create(gallery(one.edition.id, "https://example.test/fk", two.assignment.id)),
    ).rejects.toMatchObject({ code: "P2003" })
  })

  it("allows several galleries for one photographer and event", async () => {
    const { edition, assignment } = await editionWithProvider("multi")
    await db.eventResource.create(gallery(edition.id, "https://example.test/multi/1", assignment.id))
    await db.eventResource.create(gallery(edition.id, "https://example.test/multi/2", assignment.id))
    const count = await db.eventResource.count({ where: { eventServiceProviderId: assignment.id } })
    expect(count).toBe(2)
  })

  it("rejects a duplicate gallery URL within an edition", async () => {
    const { edition } = await editionWithProvider("dup")
    await db.eventResource.create(gallery(edition.id, "https://example.test/dup"))
    await expect(db.eventResource.create(gallery(edition.id, "https://example.test/dup"))).rejects.toMatchObject({
      code: "P2002",
    })
  })

  it("allows the same gallery URL in different editions", async () => {
    const a = await editionWithProvider("same-a")
    const b = await editionWithProvider("same-b")
    const url = "https://example.test/shared"
    await db.eventResource.create(gallery(a.edition.id, url))
    await expect(db.eventResource.create(gallery(b.edition.id, url))).resolves.toBeDefined()
  })
})
