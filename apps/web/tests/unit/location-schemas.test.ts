import { describe, expect, it } from "vitest"
import { formatLocationLabel, resolveLocationSlug } from "@/features/locations/rules"
import { locationInputSchema, locationListParamsSchema } from "@/features/locations/schemas"

const parse = (v: unknown) => locationInputSchema.safeParse(v)

describe("locationInputSchema", () => {
  it("requires a country", () => {
    const r = parse({ country: "   " })
    expect(r.success).toBe(false)
  })

  it("trims, collapses whitespace and turns blanks into null", () => {
    const r = parse({ country: "  Venezuela ", city: "  San   Cristóbal ", state: "", address: "   " })
    expect(r.success && r.data).toMatchObject({ country: "Venezuela", city: "San Cristóbal", state: null, address: null, slug: null })
  })

  it("normalizes a provided slug", () => {
    const r = parse({ country: "VE", slug: "  Parque Del Este!! " })
    expect(r.success && r.data.slug).toBe("parque-del-este")
  })

  it("parses and validates coordinates", () => {
    const ok = parse({ country: "VE", latitude: "10.4806", longitude: -66.9036 })
    expect(ok.success && [ok.data.latitude, ok.data.longitude]).toEqual([10.4806, -66.9036])
    expect(parse({ country: "VE", latitude: "91", longitude: "0" }).success).toBe(false)
    expect(parse({ country: "VE", latitude: "abc", longitude: "0" }).success).toBe(false)
    expect(parse({ country: "VE", latitude: "10", longitude: "181" }).success).toBe(false)
  })

  it("requires latitude and longitude together", () => {
    const r = parse({ country: "VE", latitude: "10" })
    expect(r.success).toBe(false)
    expect(!r.success && r.error.issues[0].path).toEqual(["longitude"])
  })

  it("rejects over-long values", () => {
    expect(parse({ country: "x".repeat(101) }).success).toBe(false)
  })
})

describe("location rules", () => {
  it("derives a slug from the most specific parts", () => {
    expect(resolveLocationSlug({ slug: null, venueName: "Parque del Este", city: "Caracas", state: null, country: "Venezuela" })).toBe(
      "parque-del-este-caracas-venezuela",
    )
  })

  it("prefers an explicit slug and returns null when nothing is sluggable", () => {
    expect(resolveLocationSlug({ slug: "mine", venueName: "x", city: null, state: null, country: "y" })).toBe("mine")
    expect(resolveLocationSlug({ slug: null, venueName: null, city: null, state: null, country: "!!!" })).toBeNull()
  })

  it("formats a label", () => {
    expect(formatLocationLabel({ venueName: null, city: "Mérida", state: null, country: "Venezuela" })).toBe("Mérida, Venezuela")
  })
})

describe("locationListParamsSchema", () => {
  it("falls back to safe defaults", () => {
    expect(locationListParamsSchema.parse({ q: "  a  b ", page: "-3" })).toEqual({ q: "a b", page: 1 })
    expect(locationListParamsSchema.parse({ q: "x", page: "abc" }).page).toBe(1)
    expect(locationListParamsSchema.parse({ q: "x", page: "3" }).page).toBe(3)
  })
})
