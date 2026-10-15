// Usage (dev database only): pnpm db:seed
// Run through scripts/with-db-env.ts, which loads .env and validates the target.
// Re-validates here and asks the server which database it is connected to.
import { PrismaClient } from "@prisma/client"
import { assertSafeDevDatabaseUrl, DEV_DATABASE } from "../tests/support/db-safety.ts"
import { seedCatalog } from "../prisma/seed/catalog.ts"

const db = new PrismaClient({ datasourceUrl: assertSafeDevDatabaseUrl(process.env.DATABASE_URL) })
try {
  const [{ current_database }] = await db.$queryRaw<{ current_database: string }[]>`SELECT current_database()`
  if (current_database !== DEV_DATABASE) {
    throw new Error(`Connected to "${current_database}", expected "${DEV_DATABASE}". Aborting.`)
  }
  const summary = await seedCatalog(db)
  console.log(`Sports: ${summary.sportsCreated} created, ${summary.sportsExisting} already present`)
  console.log(`Disciplines: ${summary.disciplinesCreated} created, ${summary.disciplinesExisting} already present`)
  if (summary.skipped.length) console.log(`Skipped (soft-deleted sports): ${summary.skipped.join(", ")}`)
} finally {
  await db.$disconnect()
}
