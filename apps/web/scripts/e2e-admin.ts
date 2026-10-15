// Used only by tests/e2e global setup/teardown, against events_test.
//   node --conditions=react-server scripts/e2e-admin.ts create   (E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD in env)
//   node --conditions=react-server scripts/e2e-admin.ts cleanup  (E2E_ADMIN_EMAIL in env)
import { PrismaClient } from "@prisma/client"
import { assertSafeTestDatabaseUrl } from "../tests/support/db-safety.ts"
import { createUserWithPassword } from "../src/server/auth/provision.ts"

const url = assertSafeTestDatabaseUrl(process.env.DATABASE_URL)
const db = new PrismaClient({ datasourceUrl: url })
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
const PREFIX = "itest-e2e-"

try {
  const [{ current_database }] = await db.$queryRaw<{ current_database: string }[]>`SELECT current_database()`
  if (current_database !== "events_test") throw new Error(`Connected to "${current_database}", expected events_test.`)
  if (!email?.startsWith("itest-e2e-")) throw new Error("E2E_ADMIN_EMAIL must start with itest-e2e-.")

  if (process.argv[2] === "create") {
    if (!password) throw new Error("E2E_ADMIN_PASSWORD is required.")
    await createUserWithPassword({ email, name: "E2E Admin", password, role: "admin" })
    // Catalog fixtures the series and competition forms need (no seed data exists in events_test).
    const sport = await db.sport.upsert({ where: { slug: `${PREFIX}sport` }, update: {}, create: { name: "E2E Sport", slug: `${PREFIX}sport` } })
    const discipline = await db.discipline.upsert({
      where: { slug: `${PREFIX}discipline` },
      update: {},
      create: { name: "E2E Discipline", slug: `${PREFIX}discipline`, sportId: sport.id },
    })
    const organizerIds: Record<string, string> = {}
    for (const n of ["Alpha", "Beta", "Gamma"]) {
      const organizer = await db.organizer.upsert({ where: { slug: `${PREFIX}org-${n.toLowerCase()}` }, update: {}, create: { name: `E2E Org ${n}`, slug: `${PREFIX}org-${n.toLowerCase()}` } })
      organizerIds[n] = organizer.id
    }
    // Competition form fixtures: "trail-running" is the slug that selects the Trail Running metadata fields.
    await db.discipline.upsert({
      where: { slug: "trail-running" },
      update: {},
      create: { name: "E2E Trail Running", slug: "trail-running", sportId: sport.id },
    })
    // Edition form fixtures: a series whose organizer template is Alpha (primary) + Beta (co-organizer), and a venue.
    const templateSeries = await db.eventSeries.upsert({
      where: { slug: `${PREFIX}template-series` },
      update: {},
      create: {
        name: "E2E Template Series",
        slug: `${PREFIX}template-series`,
        disciplineId: discipline.id,
        organizers: { create: [{ organizerId: organizerIds.Alpha, role: "PRIMARY" }, { organizerId: organizerIds.Beta, role: "CO_ORGANIZER" }] },
      },
    })
    const venue = await db.location.upsert({
      where: { slug: `${PREFIX}venue` },
      update: {},
      create: { country: "Venezuela", city: "E2E City", venueName: "E2E Venue", slug: `${PREFIX}venue` },
    })
    // The edition the competition journey creates competitions under (2032-06-10 to 2032-06-12, at the venue).
    await db.eventEdition.upsert({
      where: { slug: `${PREFIX}fixture-edition` },
      update: {},
      create: {
        eventSeriesId: templateSeries.id,
        name: "E2E Fixture Edition",
        slug: `${PREFIX}fixture-edition`,
        year: 2032,
        startsOn: new Date("2032-06-10T00:00:00.000Z"),
        endsOn: new Date("2032-06-12T00:00:00.000Z"),
        locationId: venue.id,
      },
    })
  } else if (process.argv[2] === "cleanup") {
    // Editions created through the UI are only soft-deleted there; remove them (and their assignments) here.
    await db.competition.deleteMany({ where: { eventEdition: { slug: { startsWith: PREFIX } } } })
    await db.eventEditionOrganizer.deleteMany({ where: { eventEdition: { slug: { startsWith: PREFIX } } } })
    await db.eventEdition.deleteMany({ where: { slug: { startsWith: PREFIX } } })
    await db.eventSeriesOrganizer.deleteMany({ where: { eventSeries: { slug: { startsWith: PREFIX } } } })
    await db.eventSeries.deleteMany({ where: { slug: { startsWith: PREFIX }, editions: { none: {} } } })
    await db.organizer.deleteMany({ where: { slug: { startsWith: PREFIX }, seriesAssignments: { none: {} }, editionAssignments: { none: {} } } })
    await db.location.deleteMany({ where: { slug: { startsWith: PREFIX }, eventEditions: { none: {} }, competitions: { none: {} } } })
    await db.discipline.deleteMany({ where: { slug: "trail-running", sport: { slug: `${PREFIX}sport` }, eventSeries: { none: {} }, competitions: { none: {} } } })
    await db.discipline.deleteMany({ where: { slug: `${PREFIX}discipline`, eventSeries: { none: {} } } })
    await db.sport.deleteMany({ where: { slug: `${PREFIX}sport`, disciplines: { none: {} } } })
    await db.user.deleteMany({ where: { email } }) // sessions and accounts cascade
  } else {
    throw new Error("Usage: e2e-admin.ts create|cleanup")
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
process.exit(process.exitCode ?? 0)
