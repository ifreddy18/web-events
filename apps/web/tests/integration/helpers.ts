import { PrismaClient } from "@prisma/client"
import { assertSafeTestDatabaseUrl, TEST_DATABASE } from "../support/db-safety"

// Every fixture row uses this slug/name prefix so cleanup only touches its own data.
export const P = "itest-"

export function createTestClient() {
  const url = assertSafeTestDatabaseUrl(process.env.DATABASE_URL)
  return new PrismaClient({ datasourceUrl: url })
}

/** Second line of defence: ask the server which database we are really on. */
export async function assertConnectedToTestDatabase(db: PrismaClient) {
  const [{ current_database }] = await db.$queryRaw<{ current_database: string }[]>`SELECT current_database()`
  if (current_database !== TEST_DATABASE) {
    throw new Error(`Connected to "${current_database}", expected "${TEST_DATABASE}". Aborting.`)
  }
}

/** Deletes only rows created by these tests (prefix-scoped), children first. */
export async function cleanupFixtures(db: PrismaClient) {
  await assertConnectedToTestDatabase(db)
  const like = { startsWith: P }
  const editions = { eventEdition: { slug: like } }
  await db.eventResource.deleteMany({ where: editions })
  await db.eventServiceProvider.deleteMany({ where: editions })
  await db.eventEditionOrganizer.deleteMany({ where: editions })
  await db.eventSeriesOrganizer.deleteMany({ where: { eventSeries: { slug: like } } })
  await db.eventEdition.deleteMany({ where: { slug: like } })
  await db.eventSeries.deleteMany({ where: { slug: like } })
  await db.serviceProvider.deleteMany({ where: { slug: like } })
  await db.organizer.deleteMany({ where: { slug: like } })
  await db.discipline.deleteMany({ where: { slug: like } })
  await db.sport.deleteMany({ where: { slug: like } })
  // Sessions and accounts cascade from the user.
  await db.user.deleteMany({ where: { email: like } })
}

/** Minimal fixtures: one sport/discipline/series. */
export async function createSeries(db: PrismaClient, key: string) {
  const sport = await db.sport.create({ data: { name: `${P}${key}`, slug: `${P}${key}-sport` } })
  const discipline = await db.discipline.create({
    data: { name: `${P}${key}`, slug: `${P}${key}-discipline`, sportId: sport.id },
  })
  return db.eventSeries.create({
    data: { name: `${P}${key}`, slug: `${P}${key}-series`, disciplineId: discipline.id },
  })
}

export const createEdition = (
  db: PrismaClient,
  eventSeriesId: string,
  slug: string,
  data: Partial<Parameters<PrismaClient["eventEdition"]["create"]>[0]["data"]> = {},
) =>
  db.eventEdition.create({
    data: { eventSeriesId, year: 2030, name: `${P}${slug}`, slug: `${P}${slug}`, ...data } as never,
  })

export const createOrganizer = (db: PrismaClient, key: string) =>
  db.organizer.create({ data: { name: `${P}${key}`, slug: `${P}${key}` } })

export const createProvider = (db: PrismaClient, key: string) =>
  db.serviceProvider.create({ data: { name: `${P}${key}`, slug: `${P}${key}` } })
