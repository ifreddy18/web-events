import { z } from "zod"

// Sport-specific attributes live ONLY in Competition.metadata (JSONB), validated
// here by discipline slug. Add a schema when a feature needs that discipline;
// do not pre-build the others. Unknown keys are rejected.

const baseCompetitionMetadata = {
  tags: z.array(z.string().trim().min(1)).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  beginnerFriendly: z.boolean().optional(),
}

export const trailRunningMetadataSchema = z.strictObject({
  ...baseCompetitionMetadata,
  distanceKm: z.number().positive(),
  elevationGainMeters: z.number().nonnegative().optional(),
  terrainTypes: z.array(z.string().trim().min(1)).optional(),
  cutoffMinutes: z.number().int().positive().optional(),
})

export type TrailRunningMetadata = z.infer<typeof trailRunningMetadataSchema>

const metadataSchemas: Record<string, z.ZodType> = {
  "trail-running": trailRunningMetadataSchema,
}

export type MetadataResult =
  | { ok: true; data: Record<string, unknown> | null }
  | { ok: false; message: string; issues?: z.core.$ZodIssue[] }

/** Validates Competition.metadata for the given discipline slug. Empty metadata is always valid. */
export function parseCompetitionMetadata(disciplineSlug: string, raw: unknown): MetadataResult {
  if (raw === null || raw === undefined) return { ok: true, data: null }
  const schema = metadataSchemas[disciplineSlug]
  if (!schema) {
    return { ok: false, message: `No metadata schema is defined for discipline "${disciplineSlug}".` }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, message: "Invalid competition metadata.", issues: parsed.error.issues }
  return { ok: true, data: parsed.data as Record<string, unknown> }
}
