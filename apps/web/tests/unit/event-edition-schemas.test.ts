import { describe, expect, it } from "vitest"
import { deriveEditionSlug, validateEditionRules, type EditionRuleInput } from "@/features/event-editions/rules"
import {
  eventEditionCreateSchema,
  eventEditionListParamsSchema,
  eventEditionUpdateSchema,
} from "@/features/event-editions/schemas"

const SERIES_ID = "11111111-1111-4111-8111-111111111111"
const ORGANIZER_A = "22222222-2222-4222-8222-222222222222"
const ORGANIZER_B = "33333333-3333-4333-8333-333333333333"

const rulesInput = (overrides: Partial<EditionRuleInput> = {}): EditionRuleInput => ({
  startsOn: null,
  endsOn: null,
  startTime: null,
  endTime: null,
  rescheduledFromOn: null,
  registrationOpenAt: null,
  registrationCloseAt: null,
  status: "SCHEDULED",
  ...overrides,
})
const fieldsOf = (input: EditionRuleInput) => validateEditionRules(input).map((issue) => issue.field)

const without = <T extends Record<string, unknown>>(value: T, ...keys: string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))

const validCreate = (overrides: Record<string, unknown> = {}) => ({
  eventSeriesId: SERIES_ID,
  name: "Maratón del Sol",
  year: "2030",
  primaryOrganizerId: ORGANIZER_A,
  ...overrides,
})

describe("edition date and time rules", () => {
  it("accepts a fully TBA edition", () => {
    expect(validateEditionRules(rulesInput())).toEqual([])
  })

  it("rejects an end date, start time or end time without a start date", () => {
    expect(fieldsOf(rulesInput({ endsOn: "2030-05-02", startTime: "07:00", endTime: "09:00" }))).toEqual(["endsOn", "startTime", "endTime"])
  })

  it("accepts single-day, multi-day and timed editions", () => {
    expect(validateEditionRules(rulesInput({ startsOn: "2030-05-01" }))).toEqual([])
    expect(validateEditionRules(rulesInput({ startsOn: "2030-05-01", endsOn: "2030-05-03" }))).toEqual([])
    expect(validateEditionRules(rulesInput({ startsOn: "2030-05-01", startTime: "06:30", endTime: "11:00" }))).toEqual([])
  })

  it("rejects an end date before the start date", () => {
    expect(fieldsOf(rulesInput({ startsOn: "2030-05-02", endsOn: "2030-05-01" }))).toContain("endsOn")
  })

  it("rejects an end time before the start time on a single day", () => {
    expect(fieldsOf(rulesInput({ startsOn: "2030-05-01", startTime: "22:00", endTime: "02:00" }))).toEqual(["endTime"])
    expect(fieldsOf(rulesInput({ startsOn: "2030-05-01", endsOn: "2030-05-01", startTime: "22:00", endTime: "02:00" }))).toEqual(["endTime"])
  })

  it("accepts an overnight event that sets a later end date", () => {
    expect(validateEditionRules(rulesInput({ startsOn: "2030-05-01", endsOn: "2030-05-02", startTime: "22:00", endTime: "02:00" }))).toEqual([])
  })

  it("requires the original date to differ from the current start date", () => {
    expect(fieldsOf(rulesInput({ startsOn: "2030-05-01", rescheduledFromOn: "2030-05-01" }))).toEqual(["rescheduledFromOn"])
  })

  it("allows a postponed edition with or without a new date", () => {
    expect(validateEditionRules(rulesInput({ status: "POSTPONED", rescheduledFromOn: "2030-03-01" }))).toEqual([])
    expect(validateEditionRules(rulesInput({ status: "POSTPONED", startsOn: "2030-09-01", rescheduledFromOn: "2030-03-01" }))).toEqual([])
  })

  it("does not allow a completed edition without a start date", () => {
    expect(fieldsOf(rulesInput({ status: "COMPLETED" }))).toEqual(["status"])
  })

  it("rejects registration closing before it opens", () => {
    expect(fieldsOf(rulesInput({ registrationOpenAt: "2030-04-02T10:00", registrationCloseAt: "2030-04-01T10:00" }))).toEqual(["registrationCloseAt"])
    expect(validateEditionRules(rulesInput({ registrationOpenAt: "2030-04-01T10:00", registrationCloseAt: "2030-04-01T10:00" }))).toEqual([])
  })
})

describe("edition slug derivation", () => {
  it("combines name, label and year so same-year editions get different slugs", () => {
    expect(deriveEditionSlug({ name: "Maratón del Sol", label: "Primavera", year: 2030 })).toBe("maraton-del-sol-primavera-2030")
    expect(deriveEditionSlug({ name: "Maratón del Sol", label: "Otoño", year: 2030 })).toBe("maraton-del-sol-otono-2030")
  })

  it("does not repeat a label or year already in the name", () => {
    expect(deriveEditionSlug({ name: "Maratón del Sol 2030", label: null, year: 2030 })).toBe("maraton-del-sol-2030")
    expect(deriveEditionSlug({ name: "Maratón del Sol Primavera", label: "Primavera", year: 2030 })).toBe("maraton-del-sol-primavera-2030")
  })

  it("falls back to the year when the name has no sluggable characters", () => {
    expect(deriveEditionSlug({ name: "¿¿??", label: null, year: 2030 })).toBe("2030")
  })
})

describe("edition input schemas", () => {
  it("normalizes a minimal create input and applies defaults", () => {
    const parsed = eventEditionCreateSchema.parse(validCreate({ name: "  Maratón   del Sol ", slug: "" }))
    expect(parsed).toMatchObject({
      name: "Maratón del Sol",
      slug: null,
      year: 2030,
      startsOn: null,
      timeZone: "America/Caracas",
      status: "SCHEDULED",
      publicationStatus: "DRAFT",
      registrationStatus: "UNKNOWN",
      locationId: null,
      coOrganizerIds: [],
    })
  })

  it("keeps date-only values as plain strings (no timestamps, no UTC shift)", () => {
    const parsed = eventEditionCreateSchema.parse(validCreate({ startsOn: "2030-05-01", endsOn: "2030-05-02", startTime: "05:30" }))
    expect(parsed.startsOn).toBe("2030-05-01")
    expect(parsed.endsOn).toBe("2030-05-02")
    expect(parsed.startTime).toBe("05:30")
  })

  it("drops seconds sent by datetime-local inputs", () => {
    const parsed = eventEditionCreateSchema.parse(validCreate({ registrationOpenAt: "2030-04-01T08:00:30" }))
    expect(parsed.registrationOpenAt).toBe("2030-04-01T08:00")
  })

  it("reports field errors for invalid values", () => {
    const result = eventEditionCreateSchema.safeParse(
      validCreate({ name: "", year: "abc", startsOn: "2030-02-30", startTime: "25:00", timeZone: "Mars/Base", registrationUrl: "javascript:1", locationId: "nope" }),
    )
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map((issue) => issue.path.join(".")) ?? []
    expect(paths).toEqual(expect.arrayContaining(["name", "year", "startsOn", "startTime", "timeZone", "registrationUrl", "locationId"]))
  })

  it("applies the cross-field rules through the schema", () => {
    const result = eventEditionCreateSchema.safeParse(validCreate({ startsOn: "2030-05-02", endsOn: "2030-05-01" }))
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain("endsOn")
  })

  it("treats an omitted primary organizer as 'copy from the series' but an empty one as invalid", () => {
    const withoutPrimary = without(validCreate(), "primaryOrganizerId")
    expect(eventEditionCreateSchema.safeParse(withoutPrimary).success).toBe(true)
    expect(eventEditionCreateSchema.safeParse(validCreate({ primaryOrganizerId: "" })).success).toBe(false)
    expect(eventEditionCreateSchema.safeParse({ ...withoutPrimary, coOrganizerIds: [ORGANIZER_B] }).success).toBe(false)
  })

  it("requires a primary organizer on update", () => {
    const rest = without(validCreate(), "primaryOrganizerId", "eventSeriesId")
    expect(eventEditionUpdateSchema.safeParse(rest).success).toBe(false)
    expect(eventEditionUpdateSchema.safeParse({ ...rest, primaryOrganizerId: ORGANIZER_A }).success).toBe(true)
  })

  it("rejects the same organizer assigned twice, including primary as co-organizer", () => {
    expect(eventEditionCreateSchema.safeParse(validCreate({ coOrganizerIds: [ORGANIZER_A] })).success).toBe(false)
    expect(eventEditionCreateSchema.safeParse(validCreate({ coOrganizerIds: [ORGANIZER_B, ORGANIZER_B] })).success).toBe(false)
    expect(eventEditionCreateSchema.safeParse(validCreate({ coOrganizerIds: [ORGANIZER_B] })).success).toBe(true)
  })

  it("accepts a published edition with open registration and no registration URL", () => {
    const parsed = eventEditionCreateSchema.parse(validCreate({ publicationStatus: "PUBLISHED", registrationStatus: "OPEN" }))
    expect(parsed).toMatchObject({ publicationStatus: "PUBLISHED", registrationStatus: "OPEN", registrationUrl: null })
  })

  it("keeps the edition year independent of the start date, e.g. a 2026 edition postponed to 2027", () => {
    const parsed = eventEditionCreateSchema.parse(
      validCreate({ year: "2026", status: "POSTPONED", startsOn: "2027-02-14", rescheduledFromOn: "2026-11-01" }),
    )
    expect(parsed).toMatchObject({ year: 2026, startsOn: "2027-02-14", status: "POSTPONED" })
    expect(eventEditionCreateSchema.safeParse(validCreate({ year: "2030", startsOn: "2031-05-01" })).success).toBe(true)
  })
})

describe("edition list params", () => {
  it("falls back to safe defaults on garbage", () => {
    expect(eventEditionListParamsSchema.parse({ q: "  a  b ", page: "-3", year: "abc", status: "NOPE", eventSeriesId: "x" })).toEqual({
      q: "a b",
      page: 1,
      year: undefined,
      status: undefined,
      publicationStatus: undefined,
      registrationStatus: undefined,
      eventSeriesId: undefined,
    })
  })

  it("accepts valid filters", () => {
    expect(eventEditionListParamsSchema.parse({ q: "", page: "2", year: "2030", status: "POSTPONED", publicationStatus: "PUBLISHED", registrationStatus: "OPEN" })).toMatchObject({
      page: 2,
      year: 2030,
      status: "POSTPONED",
      publicationStatus: "PUBLISHED",
      registrationStatus: "OPEN",
    })
  })
})
