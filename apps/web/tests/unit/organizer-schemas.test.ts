import { describe, expect, it } from "vitest"
import { resolveOrganizerSlug } from "@/features/organizers/rules"
import { organizerInputSchema, organizerListParamsSchema } from "@/features/organizers/schemas"

const parse = (v: unknown) => organizerInputSchema.safeParse(v)

describe("organizerInputSchema", () => {
  it("requires a name", () => {
    expect(parse({ name: "   " }).success).toBe(false)
    expect(parse({}).success).toBe(false)
  })

  it("trims, collapses whitespace and turns blanks into null", () => {
    const r = parse({ name: "  Club   Andino ", description: "  ", website: "", instagram: "", logoUrl: "" })
    expect(r.success && r.data).toEqual({
      name: "Club Andino", slug: null, description: null, website: null, instagram: null, logoUrl: null,
    })
  })

  it("normalizes slug", () => {
    const r = parse({ name: "X", slug: "  Club Andino!! " })
    expect(r.success && r.data.slug).toBe("club-andino")
  })

  it("accepts only http(s) URLs", () => {
    expect(parse({ name: "X", website: "https://example.com" }).success).toBe(true)
    expect(parse({ name: "X", website: "javascript:alert(1)" }).success).toBe(false)
    expect(parse({ name: "X", logoUrl: "not a url" }).success).toBe(false)
    expect(parse({ name: "X", logoUrl: "ftp://example.com/a.png" }).success).toBe(false)
  })

  it("normalizes Instagram handles and URLs", () => {
    for (const v of ["@Club.Andino", "club.andino", "https://www.instagram.com/Club.Andino/?hl=es"]) {
      const r = parse({ name: "X", instagram: v })
      expect(r.success && r.data.instagram).toBe("club.andino")
    }
    expect(parse({ name: "X", instagram: "bad handle!" }).success).toBe(false)
  })

  it("rejects over-long values", () => {
    expect(parse({ name: "x".repeat(151) }).success).toBe(false)
    expect(parse({ name: "x", description: "x".repeat(2001) }).success).toBe(false)
  })
})

describe("resolveOrganizerSlug / list params", () => {
  it("prefers the given slug, else derives from the name, else null", () => {
    expect(resolveOrganizerSlug({ slug: "given", name: "Other" })).toBe("given")
    expect(resolveOrganizerSlug({ slug: null, name: "Club Ándino" })).toBe("club-andino")
    expect(resolveOrganizerSlug({ slug: null, name: "!!!" })).toBeNull()
  })

  it("sanitizes list params", () => {
    expect(organizerListParamsSchema.parse({ q: "  a  b ", page: "x" })).toEqual({ q: "a b", page: 1 })
    expect(organizerListParamsSchema.parse({ q: "", page: "3" }).page).toBe(3)
  })
})
