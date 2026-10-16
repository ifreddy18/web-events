import { rmSync } from "node:fs"
import { ADMIN_STORAGE_STATE, runAdminScript } from "./global-setup"

export default function globalTeardown() {
  rmSync(ADMIN_STORAGE_STATE, { force: true })
  runAdminScript("cleanup")
}
