import { describe, expect, it } from "vitest"
import { eventEditionCreateSchema } from "@/features/event-editions/schemas"
import { isValidTimeZone } from "@/shared/local-date"
import { buildTimeZoneGroups, PRIORITY_TIME_ZONES, timeZoneOption } from "@/shared/time-zones"

const allValues = (currentValue?: string) => buildTimeZoneGroups(currentValue).flatMap((group) => group.options.map((option) => option.value))

describe("time zone options", () => {
  it("offers Venezuela first, in the Latin America group", () => {
    const [firstGroup] = buildTimeZoneGroups("America/Caracas")
    expect(firstGroup.heading).toBe("Latin America")
    expect(firstGroup.options[0].value).toBe("America/Caracas")
  })

  it("only offers valid IANA identifiers, never fixed offsets", () => {
    const values = allValues()
    expect(values.every(isValidTimeZone)).toBe(true)
    expect(values.some((value) => /^[+-]/.test(value))).toBe(false)
    expect(PRIORITY_TIME_ZONES.every(isValidTimeZone)).toBe(true)
  })

  it("lists each zone once, even when it is also a priority zone", () => {
    const values = allValues("America/Lima")
    expect(new Set(values).size).toBe(values.length)
  })

  it("keeps a stored value the runtime does not list, so editing never drops it", () => {
    const groups = buildTimeZoneGroups("UTC")
    expect(groups[0]).toMatchObject({ heading: "Current value", options: [{ value: "UTC" }] })
  })

  it("labels a zone with a readable name and its current offset, storing only the identifier", () => {
    expect(timeZoneOption("America/Caracas")).toEqual({ value: "America/Caracas", label: "America/Caracas (GMT-04:00)" })
    expect(timeZoneOption("America/Argentina/Buenos_Aires").label).toContain("Buenos Aires")
  })
})

describe("edition time zone validation", () => {
  const base = { eventSeriesId: "11111111-1111-4111-8111-111111111111", name: "Edition", year: "2030", primaryOrganizerId: "22222222-2222-4222-8222-222222222222" }
  const timeZoneOf = (timeZone: string | undefined) => eventEditionCreateSchema.safeParse({ ...base, timeZone })

  it("defaults to America/Caracas when no zone is sent", () => {
    expect(timeZoneOf(undefined).data?.timeZone).toBe("America/Caracas")
    expect(timeZoneOf("").data?.timeZone).toBe("America/Caracas")
  })

  it("accepts a selected identifier and a legacy alias", () => {
    expect(timeZoneOf("America/Bogota").data?.timeZone).toBe("America/Bogota")
    expect(timeZoneOf("UTC").data?.timeZone).toBe("UTC")
  })

  it("rejects unknown zones and fixed UTC offsets", () => {
    expect(timeZoneOf("Mars/Base").success).toBe(false)
    expect(timeZoneOf("-04:00").success).toBe(false)
    expect(timeZoneOf("+05:30").success).toBe(false)
  })
})
