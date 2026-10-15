import { describe, expect, it } from "vitest"
import { competitionCreateSchema, competitionListParamsSchema, competitionUpdateSchema } from "@/features/competitions/schemas"

const editionId = "11111111-1111-4111-8111-111111111111"
const disciplineId = "22222222-2222-4222-8222-222222222222"
const valid = { eventEditionId: editionId, disciplineId, name: "  21K   Trail " }

describe("competitionCreateSchema", () => {
  it("normalizes the name and fills defaults", () => {
    const parsed = competitionCreateSchema.parse(valid)
    expect(parsed).toMatchObject({
      name: "21K Trail",
      slug: null,
      locationId: null,
      description: null,
      status: "ACTIVE",
      participationType: "COMPETITIVE",
      startsOn: null,
      endsOn: null,
      startTime: null,
      endTime: null,
      registrationUrl: null,
    })
  })

  it("turns empty optional inputs into null so they inherit or stay unset", () => {
    const parsed = competitionCreateSchema.parse({ ...valid, locationId: "", startsOn: "", startTime: " ", slug: "" })
    expect(parsed).toMatchObject({ locationId: null, startsOn: null, startTime: null, slug: null })
  })

  it("keeps date-only and time-only values as strings", () => {
    const parsed = competitionCreateSchema.parse({ ...valid, startsOn: "2030-05-10", endsOn: "2030-05-11", startTime: "06:30", endTime: "13:00" })
    expect(parsed).toMatchObject({ startsOn: "2030-05-10", endsOn: "2030-05-11", startTime: "06:30", endTime: "13:00" })
  })

  it.each([
    ["missing name", { name: "  " }, "name"],
    ["missing edition", { eventEditionId: "" }, "eventEditionId"],
    ["invalid discipline", { disciplineId: "nope" }, "disciplineId"],
    ["invalid date", { startsOn: "2030-02-31" }, "startsOn"],
    ["invalid time", { endTime: "25:00" }, "endTime"],
    ["invalid status", { status: "SCHEDULED" }, "status"],
    ["invalid participation type", { participationType: "PRO" }, "participationType"],
    ["invalid registration URL", { registrationUrl: "javascript:alert(1)" }, "registrationUrl"],
    ["array metadata", { metadata: [1] }, "metadata"],
  ])("rejects %s", (_name, override, field) => {
    const result = competitionCreateSchema.safeParse({ ...valid, ...override })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field)
  })

  it("accepts recreational competitions", () => {
    expect(competitionCreateSchema.parse({ ...valid, participationType: "RECREATIONAL" }).participationType).toBe("RECREATIONAL")
  })
})

describe("competitionUpdateSchema", () => {
  it("ignores an attempt to move the competition to another edition", () => {
    const parsed = competitionUpdateSchema.parse({ ...valid, eventEditionId: "33333333-3333-4333-8333-333333333333" })
    expect(parsed).not.toHaveProperty("eventEditionId")
  })

  it("does not discard stored metadata unless asked", () => {
    expect(competitionUpdateSchema.parse(valid).discardStoredMetadata).toBe(false)
    expect(competitionUpdateSchema.parse(valid).metadata).toBeUndefined()
  })
})

describe("competitionListParamsSchema", () => {
  it("falls back to safe defaults for invalid values", () => {
    expect(competitionListParamsSchema.parse({ q: "  trail  x ", page: "-3", status: "bogus", eventEditionId: "x" })).toEqual({
      q: "trail x",
      page: 1,
      status: undefined,
      participationType: undefined,
      eventEditionId: undefined,
      disciplineId: undefined,
    })
  })
})
