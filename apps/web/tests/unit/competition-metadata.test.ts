import { describe, expect, it } from "vitest"
import { parseCompetitionMetadata } from "@/features/competitions/metadata"

describe("parseCompetitionMetadata", () => {
  it("accepts empty metadata for any discipline", () => {
    expect(parseCompetitionMetadata("anything", null)).toEqual({ ok: true, data: null })
    expect(parseCompetitionMetadata("anything", undefined)).toEqual({ ok: true, data: null })
  })

  it("accepts valid trail running metadata", () => {
    const meta = { distanceKm: 42.2, elevationGainMeters: 2100, difficulty: "advanced", tags: ["ultra"] }
    expect(parseCompetitionMetadata("trail-running", meta)).toEqual({ ok: true, data: meta })
  })

  it.each([
    ["missing distance", { elevationGainMeters: 100 }],
    ["non-positive distance", { distanceKm: 0 }],
    ["unknown key", { distanceKm: 10, laps: 3 }],
    ["bad difficulty", { distanceKm: 10, difficulty: "insane" }],
  ])("rejects trail running metadata: %s", (_name, meta) => {
    const result = parseCompetitionMetadata("trail-running", meta)
    expect(result.ok).toBe(false)
  })

  it("rejects non-empty metadata for a discipline without a schema", () => {
    const result = parseCompetitionMetadata("hyrox", { divisions: ["open"] })
    expect(result).toMatchObject({ ok: false })
  })
})
