import { z } from "zod"
import { generateSlug } from "@/lib/slug"
import { clean, optionalLocalDate, optionalLocalTime, optionalText, optionalUrl, optionalUuid } from "@/shared/field-schemas"

export const COMPETITION_STATUSES = ["ACTIVE", "CANCELLED", "COMPLETED"] as const
export const PARTICIPATION_TYPES = ["COMPETITIVE", "RECREATIONAL"] as const

export const COMPETITIONS_PAGE_SIZE = 20

const competitionFields = {
  disciplineId: z.uuid("Select a discipline."),
  // Empty means "inherit the edition's location".
  locationId: optionalUuid("Invalid location."),
  name: z.string().transform(clean).pipe(z.string().min(1, "Name is required.").max(150, "Must be at most 150 characters.")),
  // Empty means "derive from the name"; it is never silently suffixed. Unique within the edition only.
  slug: z
    .string()
    .max(150, "Must be at most 150 characters.")
    .optional()
    .transform((value) => generateSlug(value ?? "") || null),
  description: optionalText(2000),
  status: z.enum(COMPETITION_STATUSES).default("ACTIVE"),
  participationType: z.enum(PARTICIPATION_TYPES).default("COMPETITIVE"),
  // Overrides only: empty dates inherit from the edition, empty times mean "not set" (times never inherit).
  // Cross-field and edition-dependent checks run in the action through `rules.ts`.
  startsOn: optionalLocalDate,
  endsOn: optionalLocalDate,
  startTime: optionalLocalTime,
  endTime: optionalLocalTime,
  registrationUrl: optionalUrl("Registration URL"),
  // Only the shape is checked here; the discipline-specific schema runs in the action once the
  // discipline is known (`metadata.ts`). `undefined` means "leave stored metadata as it is".
  metadata: z.record(z.string(), z.unknown()).nullish(),
}

/** The parent edition is chosen once; updates do not accept `eventEditionId` (see README). */
export const competitionCreateSchema = z.object({
  ...competitionFields,
  eventEditionId: z.uuid("Select an edition."),
})

export const competitionUpdateSchema = z.object({
  ...competitionFields,
  // Explicit confirmation required to drop stored metadata (e.g. when the discipline changes).
  discardStoredMetadata: z.boolean().default(false),
})

export type CompetitionCreateInput = z.output<typeof competitionCreateSchema>
export type CompetitionUpdateInput = z.output<typeof competitionUpdateSchema>

export const competitionIdSchema = z.uuid()

export const competitionListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  status: z.enum(COMPETITION_STATUSES).optional().catch(undefined),
  participationType: z.enum(PARTICIPATION_TYPES).optional().catch(undefined),
  eventEditionId: z.uuid().optional().catch(undefined),
  disciplineId: z.uuid().optional().catch(undefined),
})
