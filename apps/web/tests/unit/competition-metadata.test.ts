import { describe, expect, it } from "vitest"
import {
  EMPTY_TRAIL_RUNNING_FORM,
  parseCompetitionMetadata,
  resolveCompetitionMetadata,
  trailRunningFormToMetadata,
  trailRunningMetadataToForm,
} from "@/features/competitions/metadata"

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
    ["non-positive distance", { distanceKm: 0 }],
    ["unknown key", { distanceKm: 10, laps: 3 }],
    ["bad difficulty", { distanceKm: 10, difficulty: "insane" }],
  ])("rejects trail running metadata: %s", (_name, meta) => {
    const result = parseCompetitionMetadata("trail-running", meta)
    expect(result.ok).toBe(false)
  })

  it("accepts trail running metadata without a distance, but not a non-positive or non-numeric one", () => {
    expect(parseCompetitionMetadata("trail-running", { elevationGainMeters: 100 })).toEqual({ ok: true, data: { elevationGainMeters: 100 } })
    expect(parseCompetitionMetadata("trail-running", { distanceKm: -5 }).ok).toBe(false)
    expect(parseCompetitionMetadata("trail-running", { distanceKm: "far" }).ok).toBe(false)
  })

  it("rejects non-empty metadata for a discipline without a schema", () => {
    const result = parseCompetitionMetadata("hyrox", { divisions: ["open"] })
    expect(result).toMatchObject({ ok: false })
  })
})

describe("parseCompetitionMetadata with empty objects", () => {
  it("treats an empty object as empty metadata, even for a discipline without a schema", () => {
    expect(parseCompetitionMetadata("hyrox", {})).toEqual({ ok: true, data: null })
    expect(parseCompetitionMetadata("trail-running", {})).toEqual({ ok: true, data: null })
  })
})

describe("resolveCompetitionMetadata", () => {
  const base = { disciplineSlug: "trail-running", submitted: undefined, stored: null, disciplineChanged: false, discardStored: false }

  it("stores validated metadata on create", () => {
    expect(resolveCompetitionMetadata({ ...base, submitted: { distanceKm: 21 } })).toEqual({ ok: true, metadata: { distanceKm: 21 } })
  })

  it("stores null when the submission is empty", () => {
    expect(resolveCompetitionMetadata({ ...base, submitted: {} })).toEqual({ ok: true, metadata: null })
    expect(resolveCompetitionMetadata({ ...base, submitted: null })).toEqual({ ok: true, metadata: null })
  })

  it("reports field errors keyed by metadata path", () => {
    const result = resolveCompetitionMetadata({ ...base, submitted: { distanceKm: "abc", cutoffMinutes: 1.5 } })
    expect(result).toMatchObject({ ok: false, fieldErrors: { "metadata.distanceKm": expect.any(Array), "metadata.cutoffMinutes": expect.any(Array) } })
  })

  it("stores trail details without inventing a distance", () => {
    const result = resolveCompetitionMetadata({ ...base, submitted: { difficulty: "elite" } })
    expect(result).toEqual({ ok: true, metadata: { difficulty: "elite" } })
  })

  it("rejects a non-positive distance", () => {
    const result = resolveCompetitionMetadata({ ...base, submitted: { distanceKm: 0 } })
    expect(result).toMatchObject({ ok: false, fieldErrors: { "metadata.distanceKm": expect.any(Array) } })
  })

  it("rejects unknown keys in the submission", () => {
    const result = resolveCompetitionMetadata({ ...base, submitted: { distanceKm: 10, laps: 3 } })
    expect(result).toMatchObject({ ok: false, fieldErrors: { metadata: expect.any(Array) } })
  })

  it("keeps stored metadata when the form did not submit any", () => {
    const stored = { distanceKm: 10, extra: "kept" }
    expect(resolveCompetitionMetadata({ ...base, stored })).toEqual({ ok: true, metadata: stored })
  })

  it("keeps stored properties the schema does not manage while replacing managed ones", () => {
    const stored = { distanceKm: 10, elevationGainMeters: 500, aidStations: 4 }
    const result = resolveCompetitionMetadata({ ...base, stored, submitted: { distanceKm: 12 } })
    expect(result).toEqual({ ok: true, metadata: { aidStations: 4, distanceKm: 12 } })
  })

  it("accepts empty metadata for a discipline without a schema and keeps what is stored", () => {
    expect(resolveCompetitionMetadata({ ...base, disciplineSlug: "hyrox", submitted: undefined })).toEqual({ ok: true, metadata: null })
    expect(resolveCompetitionMetadata({ ...base, disciplineSlug: "hyrox", submitted: {}, stored: { division: "open" } })).toEqual({
      ok: true,
      metadata: { division: "open" },
    })
  })

  it("rejects non-empty submissions for a discipline without a schema", () => {
    const result = resolveCompetitionMetadata({ ...base, disciplineSlug: "hyrox", submitted: { division: "open" } })
    expect(result).toMatchObject({ ok: false, fieldErrors: { metadata: expect.any(Array) } })
  })

  it("requires explicit confirmation to drop stored metadata when the discipline changes", () => {
    const stored = { distanceKm: 10 }
    expect(resolveCompetitionMetadata({ ...base, disciplineSlug: "hyrox", stored, disciplineChanged: true })).toMatchObject({
      ok: false,
      fieldErrors: { disciplineId: expect.any(Array) },
    })
    expect(resolveCompetitionMetadata({ ...base, disciplineSlug: "hyrox", stored, disciplineChanged: true, discardStored: true })).toEqual({
      ok: true,
      metadata: null,
    })
  })

  it("lets a discipline change start from submitted metadata once the old metadata is discarded", () => {
    const result = resolveCompetitionMetadata({ ...base, stored: { foo: 1 }, disciplineChanged: true, discardStored: true, submitted: { distanceKm: 5 } })
    expect(result).toEqual({ ok: true, metadata: { distanceKm: 5 } })
  })
})

describe("Trail Running form codec", () => {
  const filled = {
    distanceKm: "21,5",
    elevationGainMeters: "1200",
    cutoffMinutes: "300",
    terrainTypes: "mountain, rocky ,",
    tags: "",
    difficulty: "advanced",
    beginnerFriendly: true,
  }

  it("converts form text to metadata, omitting blanks and accepting decimal commas", () => {
    expect(trailRunningFormToMetadata(filled)).toEqual({
      distanceKm: 21.5,
      elevationGainMeters: 1200,
      cutoffMinutes: 300,
      terrainTypes: ["mountain", "rocky"],
      difficulty: "advanced",
      beginnerFriendly: true,
    })
    expect(trailRunningFormToMetadata(EMPTY_TRAIL_RUNNING_FORM)).toEqual({})
  })

  it("passes unparsable numbers through so the server can report them", () => {
    expect(trailRunningFormToMetadata({ ...EMPTY_TRAIL_RUNNING_FORM, distanceKm: "far" })).toEqual({ distanceKm: "far" })
  })

  it("round-trips stored metadata through the form values", () => {
    const metadata = trailRunningFormToMetadata(filled)
    expect(trailRunningFormToMetadata(trailRunningMetadataToForm(metadata))).toEqual(metadata)
    expect(trailRunningMetadataToForm(null)).toEqual(EMPTY_TRAIL_RUNNING_FORM)
  })
})
