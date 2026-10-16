import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { seedCatalog, seedProviderTypes } from "../../prisma/seed/catalog"
import type { CatalogSport } from "../../prisma/seed/catalog.data"
import { assertConnectedToTestDatabase, cleanupFixtures, createTestClient, P } from "./helpers"

const catalog: CatalogSport[] = [
  {
    name: "Itest Sport A", slug: `${P}seed-a`, description: "A",
    disciplines: [
      { name: "Itest A1", slug: `${P}seed-a1`, description: "A1" },
      { name: "Itest A2", slug: `${P}seed-a2`, description: "A2" },
    ],
  },
  {
    name: "Itest Sport B", slug: `${P}seed-b`, description: "B",
    disciplines: [{ name: "Itest B1", slug: `${P}seed-b1`, description: "B1" }],
  },
]

let db: PrismaClient
beforeAll(async () => {
  db = createTestClient()
  await assertConnectedToTestDatabase(db)
  await cleanupFixtures(db)
})
afterAll(async () => {
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("catalog seed (events_test)", () => {
  it("creates sports and links each discipline to its sport", async () => {
    const s = await seedCatalog(db, catalog)
    expect(s).toMatchObject({ sportsCreated: 2, disciplinesCreated: 3, skipped: [] })
    const a = await db.sport.findUniqueOrThrow({ where: { slug: `${P}seed-a` }, include: { disciplines: true } })
    expect(a.disciplines.map((d) => d.slug).sort()).toEqual([`${P}seed-a1`, `${P}seed-a2`])
  })

  it("creates nothing and no duplicates when run a second time", async () => {
    const s = await seedCatalog(db, catalog)
    expect(s).toMatchObject({ sportsCreated: 0, sportsExisting: 2, disciplinesCreated: 0, disciplinesExisting: 3 })
    expect(await db.sport.count({ where: { slug: { startsWith: P } } })).toBe(2)
    expect(await db.discipline.count({ where: { slug: { startsWith: P } } })).toBe(3)
  })

  it("keeps manual edits and only re-creates missing disciplines", async () => {
    await db.sport.update({ where: { slug: `${P}seed-a` }, data: { name: "Edited by hand" } })
    await db.discipline.delete({ where: { slug: `${P}seed-a2` } })
    const s = await seedCatalog(db, catalog)
    expect(s.disciplinesCreated).toBe(1)
    expect((await db.sport.findUniqueOrThrow({ where: { slug: `${P}seed-a` } })).name).toBe("Edited by hand")
  })

  it("leaves a soft-deleted sport untouched and skips its disciplines", async () => {
    await db.discipline.deleteMany({ where: { slug: `${P}seed-b1` } })
    await db.sport.update({ where: { slug: `${P}seed-b` }, data: { deletedAt: new Date() } })
    const s = await seedCatalog(db, catalog)
    expect(s.skipped).toEqual([`${P}seed-b`])
    expect(await db.discipline.count({ where: { slug: `${P}seed-b1` } })).toBe(0)
    expect((await db.sport.findUniqueOrThrow({ where: { slug: `${P}seed-b` } })).deletedAt).not.toBeNull()
  })
})

describe("provider type seed (events_test)", () => {
  const providerTypes = [{ name: "Itest type", slug: `${P}seed-type`, description: "T" }]

  it("inserts missing provider types once and never overwrites existing ones", async () => {
    expect(await seedProviderTypes(db, providerTypes)).toEqual({ providerTypesCreated: 1, providerTypesExisting: 0 })
    await db.serviceProviderType.update({ where: { slug: `${P}seed-type` }, data: { name: "Edited by hand" } })
    expect(await seedProviderTypes(db, providerTypes)).toEqual({ providerTypesCreated: 0, providerTypesExisting: 1 })
    expect((await db.serviceProviderType.findUniqueOrThrow({ where: { slug: `${P}seed-type` } })).name).toBe("Edited by hand")
  })
})
