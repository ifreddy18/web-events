import { runAdminScript } from "./global-setup"

export default function globalTeardown() {
  runAdminScript("cleanup")
}
