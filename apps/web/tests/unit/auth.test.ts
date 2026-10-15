import { describe, expect, it } from "vitest"
import { loginSchema } from "@/features/auth/schemas"


describe("loginSchema", () => {
  it("accepts and trims a valid email", () => {
    const parsed = loginSchema.parse({ email: "  admin@example.com ", password: "x" })
    expect(parsed.email).toBe("admin@example.com")
  })

  it.each([
    ["empty email", { email: "", password: "x" }, "email"],
    ["malformed email", { email: "nope", password: "x" }, "email"],
    ["empty password", { email: "a@example.com", password: "" }, "password"],
  ])("rejects %s", (_n, input, field) => {
    const result = loginSchema.safeParse(input)
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe(field)
  })
})
