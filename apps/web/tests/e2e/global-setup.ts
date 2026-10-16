import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { chromium, type FullConfig } from "@playwright/test"

export const ADMIN_STORAGE_STATE = "test-results/admin-session.json"

// Per-run throwaway admin in events_test, created through Better Auth's provisioning helper
// (public sign-up stays disabled). Credentials live only in this process tree's environment.
export function runAdminScript(action: "create" | "cleanup") {
  const result = spawnSync("node", ["--conditions=react-server", "scripts/e2e-admin.ts", action], {
    env: process.env,
    encoding: "utf8",
  })
  if (result.status !== 0) {
    throw new Error(`E2E admin ${action} failed: ${(result.stderr || result.stdout).trim()}`)
  }
}

export default async function globalSetup(config: FullConfig) {
  process.env.E2E_ADMIN_EMAIL = `itest-e2e-${randomBytes(6).toString("hex")}@example.test`
  process.env.E2E_ADMIN_PASSWORD = randomBytes(18).toString("base64url")
  runAdminScript("create")

  // One real sign-in for the whole run: the sign-in endpoint is rate limited to 5 per minute.
  // Each test gets its own browser context initialised from the saved (git-ignored) state.
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ baseURL: config.projects[0].use.baseURL })
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.E2E_ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD)
    await page.getByRole("button", { name: /sign in|log in/i }).click()
    await page.waitForURL("**/admin")
    await page.context().storageState({ path: ADMIN_STORAGE_STATE })
  } catch (error) {
    // Playwright does not run globalTeardown when globalSetup throws.
    runAdminScript("cleanup")
    throw error
  } finally {
    await browser.close()
  }
}
