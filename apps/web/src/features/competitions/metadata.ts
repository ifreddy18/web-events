import { z } from "zod"
import { addFieldError, type FieldErrors } from "@/shared/action-result"

// Sport-specific attributes live ONLY in Competition.metadata (JSONB), validated
// here by discipline slug. Add a schema when a feature needs that discipline;
// do not pre-build the others. Unknown keys are rejected.
//
// This file is imported by client components (form codecs below) and by server
// actions, so it must stay free of server-only code.

const baseCompetitionMetadata = {
  tags: z.array(z.string().trim().min(1)).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  beginnerFriendly: z.boolean().optional(),
}

export const DIFFICULTIES = ["beginner", "intermediate", "advanced", "elite"] as const

export const trailRunningMetadataSchema = z.strictObject({
  ...baseCompetitionMetadata,
  // Optional: a trail competition can be announced before its course distance is confirmed. When given it must be positive.
  distanceKm: z.number({ error: "Enter a number." }).positive("Distance must be greater than 0.").optional(),
  elevationGainMeters: z.number({ error: "Enter a number." }).nonnegative("Elevation gain cannot be negative.").optional(),
  terrainTypes: z.array(z.string().trim().min(1)).optional(),
  cutoffMinutes: z.number({ error: "Enter a whole number of minutes." }).int("Enter a whole number of minutes.").positive("Cutoff must be greater than 0.").optional(),
})

export type TrailRunningMetadata = z.infer<typeof trailRunningMetadataSchema>

/** One strict schema per discipline slug. A discipline without an entry only accepts empty metadata. */
const metadataSchemas: Record<string, z.ZodObject> = {
  "trail-running": trailRunningMetadataSchema,
}

/** True when the admin form can edit metadata for this discipline. */
export function hasMetadataSchema(disciplineSlug: string) {
  return disciplineSlug in metadataSchemas
}

export type MetadataResult =
  | { ok: true; data: Record<string, unknown> | null }
  | { ok: false; message: string; issues?: z.core.$ZodIssue[] }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Validates Competition.metadata for the given discipline slug. Empty metadata (null,
 * undefined or `{}`) is always valid, including for disciplines without a schema.
 */
export function parseCompetitionMetadata(disciplineSlug: string, raw: unknown): MetadataResult {
  if (raw === null || raw === undefined) return { ok: true, data: null }
  if (isRecord(raw) && Object.keys(raw).length === 0) return { ok: true, data: null }
  const schema = metadataSchemas[disciplineSlug]
  if (!schema) {
    return { ok: false, message: `No metadata schema is defined for discipline "${disciplineSlug}".` }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: "Invalid competition metadata.", issues: parsed.error.issues }
  return { ok: true, data: parsed.data as Record<string, unknown> }
}

export interface MetadataResolutionInput {
  disciplineSlug: string
  /** What the form sent. `undefined` = metadata untouched; `null` or `{}` = no managed values. */
  submitted: Record<string, unknown> | null | undefined
  /** Metadata currently stored on the competition (`null` when creating). */
  stored: unknown
  /** True when an edit moves the competition to another discipline. */
  disciplineChanged: boolean
  /** Explicit admin confirmation to throw the stored metadata away. */
  discardStored: boolean
}

export type MetadataResolution =
  | { ok: true; metadata: Record<string, unknown> | null }
  | { ok: false; fieldErrors: FieldErrors }

/**
 * Decides the metadata to store when a competition is created or edited.
 *
 * - Submitted values are validated by the discipline's strict schema; anything else is rejected,
 *   so arbitrary JSON never reaches the database.
 * - Stored properties the discipline's schema does not manage (legacy or future keys) are carried
 *   over untouched: editing a competition never silently deletes data the form cannot show.
 * - Stored metadata belongs to one discipline, so moving a competition to another discipline
 *   requires `discardStored`; losing data is always an explicit choice.
 * - Disciplines without a schema keep their stored metadata and only accept empty submissions.
 */
export function resolveCompetitionMetadata(input: MetadataResolutionInput): MetadataResolution {
  const { disciplineSlug, submitted, stored, disciplineChanged, discardStored } = input
  const fieldErrors: FieldErrors = {}
  const hasStored = stored !== null && stored !== undefined && !discardStored

  if (hasStored && disciplineChanged) {
    addFieldError(
      fieldErrors,
      "disciplineId",
      "This competition has metadata for its current discipline. Confirm discarding it to change the discipline.",
    )
    return { ok: false, fieldErrors }
  }
  if (hasStored && !isRecord(stored)) {
    addFieldError(fieldErrors, "metadata", "The stored metadata is not an object. Confirm discarding it to continue.")
    return { ok: false, fieldErrors }
  }
  const storedProperties = hasStored && isRecord(stored) ? stored : {}
  const submittedIsEmpty = submitted === null || (isRecord(submitted) && Object.keys(submitted).length === 0)

  const schema = metadataSchemas[disciplineSlug]
  if (!schema) {
    if (submitted !== undefined && !submittedIsEmpty) {
      addFieldError(fieldErrors, "metadata", `There is no metadata form for discipline "${disciplineSlug}" yet; leave metadata empty.`)
      return { ok: false, fieldErrors }
    }
    return { ok: true, metadata: nullIfEmpty(storedProperties) }
  }

  // The form was not involved (e.g. a programmatic caller): keep what is stored.
  if (submitted === undefined) return { ok: true, metadata: nullIfEmpty(storedProperties) }

  const managedKeys = new Set(Object.keys(schema.shape))
  const unmanagedProperties = Object.fromEntries(Object.entries(storedProperties).filter(([key]) => !managedKeys.has(key)))

  let managedProperties: Record<string, unknown> = {}
  if (!submittedIsEmpty) {
    const parsed = parseCompetitionMetadata(disciplineSlug, submitted)
    if (!parsed.ok) {
      for (const issue of parsed.issues ?? []) {
        addFieldError(fieldErrors, issue.path.length > 0 ? `metadata.${issue.path.join(".")}` : "metadata", issue.message)
      }
      if (Object.keys(fieldErrors).length === 0) addFieldError(fieldErrors, "metadata", parsed.message)
      return { ok: false, fieldErrors }
    }
    managedProperties = parsed.data ?? {}
  }
  return { ok: true, metadata: nullIfEmpty({ ...unmanagedProperties, ...managedProperties }) }
}

function nullIfEmpty(properties: Record<string, unknown>) {
  return Object.keys(properties).length === 0 ? null : properties
}

// --- Trail Running form codec -------------------------------------------------------------
// The form works with text; these helpers convert to and from the metadata object. They never
// validate: the server runs the strict schema, so a typo is reported as a field error.

export interface TrailRunningFormValues {
  distanceKm: string
  elevationGainMeters: string
  cutoffMinutes: string
  terrainTypes: string
  tags: string
  difficulty: string
  beginnerFriendly: boolean
}

export const EMPTY_TRAIL_RUNNING_FORM: TrailRunningFormValues = {
  distanceKm: "",
  elevationGainMeters: "",
  cutoffMinutes: "",
  terrainTypes: "",
  tags: "",
  difficulty: "",
  beginnerFriendly: false,
}

/** Blank fields are omitted. Venezuelan decimal commas are accepted; unparsable text is sent as-is so the server reports it. */
export function trailRunningFormToMetadata(values: TrailRunningFormValues): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}
  const numberFrom = (text: string) => {
    const trimmed = text.trim().replace(",", ".")
    if (trimmed === "") return undefined
    return Number.isNaN(Number(trimmed)) ? text.trim() : Number(trimmed)
  }
  const listFrom = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean)

  const distanceKm = numberFrom(values.distanceKm)
  const elevationGainMeters = numberFrom(values.elevationGainMeters)
  const cutoffMinutes = numberFrom(values.cutoffMinutes)
  const terrainTypes = listFrom(values.terrainTypes)
  const tags = listFrom(values.tags)
  if (distanceKm !== undefined) metadata.distanceKm = distanceKm
  if (elevationGainMeters !== undefined) metadata.elevationGainMeters = elevationGainMeters
  if (cutoffMinutes !== undefined) metadata.cutoffMinutes = cutoffMinutes
  if (terrainTypes.length > 0) metadata.terrainTypes = terrainTypes
  if (tags.length > 0) metadata.tags = tags
  if (values.difficulty !== "") metadata.difficulty = values.difficulty
  // An unchecked box means "not set": false and absent mean the same thing for readers.
  if (values.beginnerFriendly) metadata.beginnerFriendly = true
  return metadata
}

export function trailRunningMetadataToForm(metadata: unknown): TrailRunningFormValues {
  if (!isRecord(metadata)) return { ...EMPTY_TRAIL_RUNNING_FORM }
  const text = (value: unknown) => (typeof value === "number" || typeof value === "string" ? String(value) : "")
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item) => typeof item === "string").join(", ") : "")
  return {
    distanceKm: text(metadata.distanceKm),
    elevationGainMeters: text(metadata.elevationGainMeters),
    cutoffMinutes: text(metadata.cutoffMinutes),
    terrainTypes: list(metadata.terrainTypes),
    tags: list(metadata.tags),
    difficulty: text(metadata.difficulty),
    beginnerFriendly: metadata.beginnerFriendly === true,
  }
}
