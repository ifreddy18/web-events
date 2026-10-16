import { describe, expect, it } from "vitest"
import { PROVIDER_TYPES } from "../../prisma/seed/catalog.data"
import { diffDisciplineIds, firstFreeSlug, PHOTOGRAPHER_TYPE_SLUG, resolvePhotographerSlugBase } from "@/features/photographers/rules"
import { photographerInputSchema, photographerListParamsSchema } from "@/features/photographers/schemas"

const parse = (input: Record<string, unknown>) => photographerInputSchema.safeParse(input)
const parsed = (input: Record<string, unknown>) => {
  const result = parse(input)
  if (!result.success) throw new Error(result.error.message)
  return result.data
}

describe("photographer profile validation", () => {
  it("accepts an Instagram-only profile with no other contact data", () => {
    expect(parsed({ name: "  Lens   Team ", instagram: "https://www.instagram.com/Lens.Team/?hl=es" })).toMatchObject({
      name: "Lens Team",
      instagram: "lens.team",
      website: null,
      email: null,
      phone: null,
      disciplineIds: [],
    })
  })

  it("requires a name", () => {
    expect(parse({ name: "  " }).success).toBe(false)
  })

  it("normalizes handles, URLs, email and country code", () => {
    expect(
      parsed({ name: "A", instagram: "@Foo_Bar", website: "https://example.com", email: " Me@Example.COM ", countryCode: "ve", phone: "+58 412-1234567" }),
    ).toMatchObject({ instagram: "foo_bar", website: "https://example.com/", email: "me@example.com", countryCode: "VE", phone: "+58 412-1234567" })
  })

  it.each([
    ["website", { website: "ftp://example.com" }],
    ["profileImageUrl", { profileImageUrl: "not a url" }],
    ["instagram", { instagram: "bad handle!" }],
    ["email", { email: "nope" }],
    ["phone", { phone: "abc" }],
    ["countryCode", { countryCode: "ZZ" }],
    ["disciplineIds", { disciplineIds: ["not-a-uuid"] }],
  ])("rejects an invalid %s", (field, extra) => {
    const result = parse({ name: "A", ...extra })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((issue) => issue.path[0] === field)).toBe(true)
  })

  it("removes duplicate discipline ids", () => {
    const id = "6f1c0a52-1d7e-4c8f-9a3b-2b1d5e7f9a10"
    expect(parsed({ name: "A", disciplineIds: [id, id] }).disciplineIds).toEqual([id])
  })

  it("treats list parameters leniently", () => {
    expect(photographerListParamsSchema.parse({ q: "  foo  bar ", page: "abc", disciplineId: "x" })).toEqual({ q: "foo bar", page: 1, disciplineId: undefined })
  })
})

describe("photographer rules", () => {
  it("uses the seeded provider type slug", () => {
    expect(PROVIDER_TYPES.map((type) => type.slug)).toContain(PHOTOGRAPHER_TYPE_SLUG)
  })

  it("derives a slug base from the name unless one is given", () => {
    expect(resolvePhotographerSlugBase({ name: "Ana Pérez", slug: null })).toBe("ana-perez")
    expect(resolvePhotographerSlugBase({ name: "Ana", slug: "custom" })).toBe("custom")
  })

  it("picks the first free numeric suffix", () => {
    expect(firstFreeSlug("ana", new Set())).toBe("ana")
    expect(firstFreeSlug("ana", new Set(["ana", "ana-2"]))).toBe("ana-3")
  })

  it("computes the minimal discipline change set", () => {
    expect(diffDisciplineIds(["a", "b"], ["b", "c"])).toEqual({ remove: ["a"], add: ["c"] })
  })
})
