import { loadEnvFile } from "node:process"
import { defineConfig, devices } from "@playwright/test"
import { assertSafeTestDatabaseUrl } from "./tests/support/db-safety"

// E2E runs the app against events_test only. Process env takes precedence
// over Next's .env files, so the dev database can never be picked up.
delete process.env.DATABASE_URL
loadEnvFile(".env.test")
const databaseUrl = assertSafeTestDatabaseUrl(process.env.DATABASE_URL)

const PORT = 3100

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next dev --webpack --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: databaseUrl },
  },
})
