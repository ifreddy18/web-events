import { describe, expect, it } from "vitest"
import { isLocalDate, isLocalTime, localDateFromDb, localDateToDb } from "@/shared/local-date"

describe("local dates", () => {
  it("validates real calendar dates", () => {
    expect(isLocalDate("2030-02-28")).toBe(true)
    expect(isLocalDate("2032-02-29")).toBe(true)
    expect(isLocalDate("2030-02-30")).toBe(false)
    expect(isLocalDate("2030-2-3")).toBe(false)
  })

  it("validates HH:mm", () => {
    expect(isLocalTime("00:00")).toBe(true)
    expect(isLocalTime("23:59")).toBe(true)
    expect(isLocalTime("24:00")).toBe(false)
    expect(isLocalTime("9:00")).toBe(false)
  })

  it("round-trips DB dates without timezone shifts", () => {
    const original = process.env.TZ
    for (const tz of ["America/Caracas", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = tz
      expect(localDateFromDb(localDateToDb("2030-01-01"))).toBe("2030-01-01")
      expect(localDateFromDb(new Date("2030-12-31T00:00:00.000Z"))).toBe("2030-12-31")
    }
    process.env.TZ = original
    expect(localDateFromDb(null)).toBeNull()
  })

  it("rejects invalid dates on write", () => {
    expect(() => localDateToDb("2030-13-01")).toThrow(RangeError)
  })
})
