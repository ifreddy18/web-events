import { describe, expect, it } from "vitest"
import { desiredAssignments, diffAssignments, resolveSeriesSlug } from "@/features/event-series/rules"
import { eventSeriesInputSchema, eventSeriesListParamsSchema } from "@/features/event-series/schemas"

const D = "11111111-1111-4111-8111-111111111111"
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const base = { name: "Vuelta", disciplineId: D, primaryOrganizerId: A }
const parse = (v: unknown) => eventSeriesInputSchema.safeParse(v)

describe("eventSeriesInputSchema", () => {
  it("requires name, discipline and primary organizer", () => {
    const r = parse({})
    expect(!r.success && r.error.issues.map((i) => i.path[0]).sort()).toEqual(["disciplineId", "name", "primaryOrganizerId"])
    expect(parse({ ...base, name: "  " }).success).toBe(false)
  })

  it("normalizes and applies defaults", () => {
    const r = parse({ ...base, name: "  Vuelta   al Lago ", slug: " Vuelta Al Lago!! ", instagram: "@Vuelta", officialWebsite: "", description: " " })
    expect(r.success && r.data).toMatchObject({
      name: "Vuelta al Lago", slug: "vuelta-al-lago", instagram: "vuelta", officialWebsite: null, description: null,
      status: "ACTIVE", coOrganizerIds: [],
    })
  })

  it("validates status, uuids and URLs", () => {
    expect(parse({ ...base, status: "DELETED" }).success).toBe(false)
    expect(parse({ ...base, disciplineId: "x" }).success).toBe(false)
    expect(parse({ ...base, coOrganizerIds: ["x"] }).success).toBe(false)
    expect(parse({ ...base, officialWebsite: "javascript:1" }).success).toBe(false)
  })

  it("rejects duplicate organizers, including the primary repeated as co-organizer", () => {
    expect(parse({ ...base, coOrganizerIds: [B, B] }).success).toBe(false)
    const r = parse({ ...base, coOrganizerIds: [A] })
    expect(!r.success && r.error.issues[0].path).toEqual(["coOrganizerIds"])
    expect(parse({ ...base, coOrganizerIds: [B, C] }).success).toBe(true)
  })
})

describe("assignment rules", () => {
  it("derives slugs", () => {
    expect(resolveSeriesSlug({ slug: null, name: "Vuelta Ándina" })).toBe("vuelta-andina")
    expect(resolveSeriesSlug({ slug: "x", name: "y" })).toBe("x")
    expect(resolveSeriesSlug({ slug: null, name: "!!" })).toBeNull()
  })

  it("builds the desired set with one primary", () => {
    expect(desiredAssignments({ primaryOrganizerId: A, coOrganizerIds: [B] })).toEqual([
      { organizerId: A, role: "PRIMARY" },
      { organizerId: B, role: "CO_ORGANIZER" },
    ])
  })

  it("diffs: no-op, add, remove", () => {
    const cur = [{ organizerId: A, role: "PRIMARY" as const }, { organizerId: B, role: "CO_ORGANIZER" as const }]
    expect(diffAssignments(cur, cur)).toEqual({ remove: [], demote: [], promote: [], add: [] })
    expect(diffAssignments(cur, desiredAssignments({ primaryOrganizerId: A, coOrganizerIds: [C] }))).toEqual({
      remove: [B], demote: [], promote: [], add: [{ organizerId: C, role: "CO_ORGANIZER" }],
    })
  })

  it("diffs a primary swap as demote + promote", () => {
    const cur = [{ organizerId: A, role: "PRIMARY" as const }, { organizerId: B, role: "CO_ORGANIZER" as const }]
    expect(diffAssignments(cur, desiredAssignments({ primaryOrganizerId: B, coOrganizerIds: [A] }))).toEqual({
      remove: [], demote: [A], promote: [B], add: [],
    })
  })

  it("diffs a replaced primary (old removed, new added)", () => {
    const cur = [{ organizerId: A, role: "PRIMARY" as const }]
    expect(diffAssignments(cur, desiredAssignments({ primaryOrganizerId: C, coOrganizerIds: [] }))).toEqual({
      remove: [A], demote: [], promote: [], add: [{ organizerId: C, role: "PRIMARY" }],
    })
  })
})

describe("eventSeriesListParamsSchema", () => {
  it("sanitizes params", () => {
    expect(eventSeriesListParamsSchema.parse({ q: " a  b ", page: "x", status: "BAD", disciplineId: "no" })).toEqual({ q: "a b", page: 1 })
    expect(eventSeriesListParamsSchema.parse({ q: "", page: 2, status: "ARCHIVED", disciplineId: D })).toEqual({ q: "", page: 2, status: "ARCHIVED", disciplineId: D })
  })
})
