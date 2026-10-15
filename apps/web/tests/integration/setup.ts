import { loadEnvFile } from "node:process"
import { assertSafeTestDatabaseUrl } from "../support/db-safety"

// Explicitly use .env.test, overriding anything in the shell, then validate
// before any test file (or Prisma Client) can touch the database.
delete process.env.DATABASE_URL
loadEnvFile(".env.test")
assertSafeTestDatabaseUrl(process.env.DATABASE_URL)
