import { describe, expect, it } from "vitest"
import {
  instantToZonedDateTime,
  isLocalDate,
  isLocalDateTime,
  isLocalTime,
  isValidTimeZone,
  localDateFromDb,
  localDateToDb,
  zonedDateTimeToInstant,
} from "@/shared/local-date"

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

describe("wall-clock instants in a named time zone", () => {
  it("converts Caracas wall-clock time (UTC-4, no DST) to the matching instant and back", () => {
    const instant = zonedDateTimeToInstant("2030-06-15T08:30", "America/Caracas")
    expect(instant.toISOString()).toBe("2030-06-15T12:30:00.000Z")
    expect(instantToZonedDateTime(instant, "America/Caracas")).toBe("2030-06-15T08:30")
  })

  it("does not depend on the process time zone", () => {
    const original = process.env.TZ
    for (const tz of ["Pacific/Auckland", "UTC", "America/Los_Angeles"]) {
      process.env.TZ = tz
      expect(zonedDateTimeToInstant("2030-01-01T00:00", "America/Caracas").toISOString()).toBe("2030-01-01T04:00:00.000Z")
    }
    process.env.TZ = original
  })

  it("applies daylight saving offsets of the target zone", () => {
    expect(zonedDateTimeToInstant("2030-01-15T12:00", "America/New_York").toISOString()).toBe("2030-01-15T17:00:00.000Z")
    expect(zonedDateTimeToInstant("2030-07-15T12:00", "America/New_York").toISOString()).toBe("2030-07-15T16:00:00.000Z")
  })

  it("validates date-times and time zone names", () => {
    expect(isLocalDateTime("2030-06-15T08:30")).toBe(true)
    expect(isLocalDateTime("2030-06-15 08:30")).toBe(false)
    expect(isLocalDateTime("2030-06-15T24:00")).toBe(false)
    expect(isValidTimeZone("America/Caracas")).toBe(true)
    expect(isValidTimeZone("Mars/Olympus")).toBe(false)
    expect(() => zonedDateTimeToInstant("nope", "UTC")).toThrow(RangeError)
    expect(instantToZonedDateTime(null, "UTC")).toBeNull()
  })
})
