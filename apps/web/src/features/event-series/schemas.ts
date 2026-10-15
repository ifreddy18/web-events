import { z } from "zod"
import { generateSlug } from "@/lib/slug"
import { clean, instagramHandle, optionalText, optionalUrl } from "@/shared/field-schemas"

export const SERIES_STATUSES = ["ACTIVE", "ARCHIVED", "CANCELLED"] as const

export const eventSeriesInputSchema = z
  .object({
    name: z.string().transform(clean).pipe(z.string().min(1, "Name is required.").max(150, "Must be at most 150 characters.")),
    // Empty means "derive from the name"; never silently suffixed.
    slug: z
      .string()
      .max(150, "Must be at most 150 characters.")
      .optional()
      .transform((v) => generateSlug(v ?? "") || null),
    disciplineId: z.uuid("Select a discipline."),
    description: optionalText(2000),
    officialWebsite: optionalUrl("Website"),
    instagram: instagramHandle,
    status: z.enum(SERIES_STATUSES).default("ACTIVE"),
    primaryOrganizerId: z.uuid("Select a primary organizer."),
    coOrganizerIds: z.array(z.uuid("Invalid organizer.")).max(20, "At most 20 co-organizers.").default([]),
  })
  .superRefine((v, ctx) => {
    const ids = [v.primaryOrganizerId, ...v.coOrganizerIds]
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["coOrganizerIds"],
        message: "An organizer can only be assigned once (the primary cannot also be a co-organizer).",
      })
    }
  })

export type EventSeriesInput = z.output<typeof eventSeriesInputSchema>

export const eventSeriesIdSchema = z.uuid()

export const eventSeriesListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  status: z.enum(SERIES_STATUSES).optional().catch(undefined),
  disciplineId: z.uuid().optional().catch(undefined),
})

export const EVENT_SERIES_PAGE_SIZE = 20
