import { describe, expect, it } from "vitest"
import { z } from "zod"
import { fail, fromZodError, hasPrismaCode, ok } from "@/shared/action-result"

describe("action results", () => {
  it("builds ok and fail results", () => {
    expect(ok()).toEqual({ ok: true, data: undefined })
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } })
    expect(fail("not_found", "Missing")).toMatchObject({ ok: false, error: { code: "not_found", message: "Missing" } })
  })

  it("maps Zod issues to field errors by dotted path", () => {
    const parsed = z.object({ name: z.string().min(2), nested: z.object({ n: z.number() }) }).safeParse({
      name: "a",
      nested: { n: "x" },
    })
    if (parsed.success) throw new Error("expected failure")
    const result = fromZodError(parsed.error)
    expect(result.error.code).toBe("validation")
    expect(Object.keys(result.error.fieldErrors ?? {})).toEqual(["name", "nested.n"])
  })

  it("detects Prisma error codes structurally", () => {
    expect(hasPrismaCode({ code: "P2002" }, "P2002")).toBe(true)
    expect(hasPrismaCode(new Error("x"), "P2002")).toBe(false)
    expect(hasPrismaCode(null, "P2002")).toBe(false)
  })
})
