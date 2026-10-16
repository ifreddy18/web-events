import { describe, expect, it } from "vitest"
import { locationInputSchema } from "@/features/locations/schemas"
import { buildCountryGroups, COUNTRY_NAMES } from "@/shared/countries"

describe("country options", () => {
  it("covers every ISO 3166-1 country exactly once", () => {
    expect(COUNTRY_NAMES).toHaveLength(249)
    expect(new Set(COUNTRY_NAMES).size).toBe(COUNTRY_NAMES.length)
  })

  it("offers Latin America first with Venezuela on top, and the rest afterwards", () => {
    const [latinAmerica, others] = buildCountryGroups("Venezuela")
    expect(latinAmerica.heading).toBe("Latin America")
    expect(latinAmerica.options[0].value).toBe("Venezuela")
    expect(latinAmerica.options.map((option) => option.value)).toEqual(expect.arrayContaining(["Colombia", "Argentina", "Mexico", "Brazil"]))
    expect(others.options.map((option) => option.value)).toEqual(expect.arrayContaining(["Spain", "Japan"]))
    expect(others.options.map((option) => option.value)).not.toContain("Venezuela")
  })

  it("stores the plain English name existing records already use", () => {
    expect(COUNTRY_NAMES).toContain("Venezuela")
    expect(locationInputSchema.parse({ country: "Venezuela" }).country).toBe("Venezuela")
  })

  it("keeps legacy text that is not a catalog name as its own option instead of renaming it", () => {
    const groups = buildCountryGroups("venezuela")
    expect(groups[0]).toEqual({ heading: "Current value", options: [{ value: "venezuela", label: "venezuela" }] })
    expect(buildCountryGroups("Venezuela").some((group) => group.heading === "Current value")).toBe(false)
    expect(buildCountryGroups().some((group) => group.heading === "Current value")).toBe(false)
  })

  it("keeps the server accepting any non-empty country text, so old rows stay editable", () => {
    expect(locationInputSchema.safeParse({ country: "VE" }).success).toBe(true)
    expect(locationInputSchema.safeParse({ country: "" }).success).toBe(false)
  })
})
