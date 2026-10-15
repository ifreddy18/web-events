import { describe, expect, it } from "vitest"
import { hasAdminRole } from "@/server/auth/session"

describe("hasAdminRole", () => {
  it("recognises admin among comma-separated roles", () => {
    expect(hasAdminRole("admin")).toBe(true)
    expect(hasAdminRole("user, admin")).toBe(true)
  })
  it("rejects everything else", () => {
    for (const role of [undefined, null, "", "user", "administrator", "superadmin"]) {
      expect(hasAdminRole(role)).toBe(false)
    }
  })
})
