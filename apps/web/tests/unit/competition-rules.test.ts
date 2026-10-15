import { describe, expect, it } from "vitest"
import {
  resolveEffectiveSchedule,
  validateCompetitionSchedule,
  type CompetitionSchedule,
  type EditionSchedule,
} from "@/features/competitions/rules"

const edition = (o: Partial<EditionSchedule> = {}): EditionSchedule => ({
  startsOn: "2030-05-10",
  endsOn: null,
  locationId: "loc-edition",
  ...o,
})
const comp = (o: Partial<CompetitionSchedule> = {}): CompetitionSchedule => ({
  startsOn: null,
  endsOn: null,
  startTime: null,
  endTime: null,
  locationId: null,
  ...o,
})
const codes = (e: EditionSchedule, c: CompetitionSchedule) =>
  validateCompetitionSchedule(e, c).map((i) => `${i.field}:${i.code}`)

describe("resolveEffectiveSchedule", () => {
  it("inherits start date and location from the edition", () => {
    expect(resolveEffectiveSchedule(edition(), comp())).toMatchObject({
      startsOn: "2030-05-10",
      endsOn: "2030-05-10",
      locationId: "loc-edition",
    })
  })

  it("prefers competition overrides", () => {
    const eff = resolveEffectiveSchedule(
      edition({ endsOn: "2030-05-12" }),
      comp({ startsOn: "2030-05-11", endsOn: "2030-05-12", locationId: "loc-comp" }),
    )
    expect(eff).toMatchObject({ startsOn: "2030-05-11", endsOn: "2030-05-12", locationId: "loc-comp" })
  })

  it("does not span the edition implicitly", () => {
    const eff = resolveEffectiveSchedule(edition({ endsOn: "2030-05-12" }), comp())
    expect(eff.endsOn).toBe("2030-05-10")
  })

  it("keeps unknown dates unknown", () => {
    const eff = resolveEffectiveSchedule(edition({ startsOn: null, locationId: null }), comp())
    expect(eff).toMatchObject({ startsOn: null, endsOn: null, locationId: null })
  })
})

describe("validateCompetitionSchedule", () => {
  it("accepts a fully inherited schedule", () => {
    expect(codes(edition(), comp())).toEqual([])
  })

  it("accepts a multi-day competition inside a multi-day edition", () => {
    const e = edition({ endsOn: "2030-05-12" })
    expect(codes(e, comp({ startsOn: "2030-05-10", endsOn: "2030-05-12" }))).toEqual([])
  })

  it("accepts a competition on an edition whose dates are TBA", () => {
    expect(codes(edition({ startsOn: null }), comp({ startsOn: "2031-01-01" }))).toEqual([])
  })

  it("rejects competitions outside the edition window", () => {
    const e = edition({ endsOn: "2030-05-12" })
    expect(codes(e, comp({ startsOn: "2030-05-09" }))).toContain("startsOn:outside_edition")
    expect(codes(e, comp({ startsOn: "2030-05-13" }))).toContain("startsOn:outside_edition")
    expect(codes(e, comp({ startsOn: "2030-05-11", endsOn: "2030-05-13" }))).toEqual(["endsOn:outside_edition"])
  })

  it("treats a single-day edition window as its start date", () => {
    expect(codes(edition(), comp({ startsOn: "2030-05-11" }))).toContain("startsOn:outside_edition")
  })

  it("rejects an end date before the start date", () => {
    const e = edition({ endsOn: "2030-05-12" })
    expect(codes(e, comp({ startsOn: "2030-05-12", endsOn: "2030-05-11" }))).toEqual(["endsOn:end_before_start"])
  })

  it("rejects an inherited start date after the competition end date", () => {
    const e = edition({ startsOn: "2030-05-10", endsOn: "2030-05-12" })
    expect(codes(e, comp({ endsOn: "2030-05-09" }))).toContain("endsOn:end_before_start")
  })

  it("rejects endsOn without any resolvable start date", () => {
    expect(codes(edition({ startsOn: null }), comp({ endsOn: "2030-05-11" }))).toEqual(["endsOn:missing_start_date"])
  })

  it("rejects times without a resolvable date, accepts them with an inherited date", () => {
    const withTimes = comp({ startTime: "06:00", endTime: "08:00" })
    expect(codes(edition({ startsOn: null }), withTimes)).toEqual([
      "startTime:missing_start_date",
      "endTime:missing_start_date",
    ])
    expect(codes(edition(), withTimes)).toEqual([])
  })

  it("rejects inverted same-day times on inherited dates", () => {
    expect(codes(edition(), comp({ startTime: "10:00", endTime: "09:00" }))).toEqual(["endTime:time_order"])
  })

  it("allows equal times, and end before start on an overnight multi-day competition", () => {
    expect(codes(edition(), comp({ startTime: "10:00", endTime: "10:00" }))).toEqual([])
    const e = edition({ endsOn: "2030-05-11" })
    expect(codes(e, comp({ endsOn: "2030-05-11", startTime: "22:00", endTime: "04:00" }))).toEqual([])
  })

  it("reports malformed values", () => {
    expect(codes(edition(), comp({ startsOn: "2030-02-30", startTime: "25:00" }))).toEqual([
      "startsOn:invalid_date",
      "startTime:invalid_time",
    ])
  })
})
