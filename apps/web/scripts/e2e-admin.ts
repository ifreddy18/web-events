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
    // Catalog fixtures the series form needs (no seed data exists in events_test).
    const sport = await db.sport.upsert({ where: { slug: `${PREFIX}sport` }, update: {}, create: { name: "E2E Sport", slug: `${PREFIX}sport` } })
    await db.discipline.upsert({
      where: { slug: `${PREFIX}discipline` },
      update: {},
      create: { name: "E2E Discipline", slug: `${PREFIX}discipline`, sportId: sport.id },
    })
    for (const n of ["Alpha", "Beta", "Gamma"]) {
      await db.organizer.upsert({ where: { slug: `${PREFIX}org-${n.toLowerCase()}` }, update: {}, create: { name: `E2E Org ${n}`, slug: `${PREFIX}org-${n.toLowerCase()}` } })
    }
  } else if (process.argv[2] === "cleanup") {
    await db.eventSeriesOrganizer.deleteMany({ where: { eventSeries: { slug: { startsWith: PREFIX } } } })
    await db.eventSeries.deleteMany({ where: { slug: { startsWith: PREFIX }, editions: { none: {} } } })
    await db.organizer.deleteMany({ where: { slug: { startsWith: PREFIX }, seriesAssignments: { none: {} }, editionAssignments: { none: {} } } })
    await db.location.deleteMany({ where: { slug: { startsWith: PREFIX }, eventEditions: { none: {} }, competitions: { none: {} } } })
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
