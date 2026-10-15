import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"

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

export default function globalSetup() {
  process.env.E2E_ADMIN_EMAIL = `itest-e2e-${randomBytes(6).toString("hex")}@example.test`
  process.env.E2E_ADMIN_PASSWORD = randomBytes(18).toString("base64url")
  runAdminScript("create")
}
