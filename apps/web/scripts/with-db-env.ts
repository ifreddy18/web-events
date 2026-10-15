// Usage: node scripts/with-db-env.ts <dev|test> <command> [args...]
// Loads the matching env file (overriding any shell DATABASE_URL), validates
// the target database, then runs the command. Aborts before running if unsafe.
import { spawnSync } from "node:child_process"
import { loadEnvFile } from "node:process"
import {
  assertSafeDevDatabaseUrl,
  assertSafeTestDatabaseUrl,
} from "../tests/support/db-safety.ts"

const [target, ...command] = process.argv.slice(2)
if ((target !== "dev" && target !== "test") || command.length === 0) {
  console.error("Usage: with-db-env.ts <dev|test> <command> [args...]")
  process.exit(2)
}

// Prevent a shell-level DATABASE_URL from leaking into the chosen environment.
delete process.env.DATABASE_URL
try {
  loadEnvFile(target === "test" ? ".env.test" : ".env")
  const url = process.env.DATABASE_URL
  if (target === "test") assertSafeTestDatabaseUrl(url)
  else assertSafeDevDatabaseUrl(url)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const result = spawnSync(command[0], command.slice(1), { stdio: "inherit", env: process.env })
process.exit(result.status ?? 1)
