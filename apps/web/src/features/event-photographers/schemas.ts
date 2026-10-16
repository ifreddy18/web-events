import { z } from "zod"
import { clean, optionalText } from "@/shared/field-schemas"

/** Mirrors the Prisma enum `ProviderAccreditation`; kept as a tuple so Zod and the UI share one list. */
export const ACCREDITATIONS = ["UNKNOWN", "OFFICIAL", "INDEPENDENT"] as const

/** Search results are loaded this many at a time ("Show more" asks for the next page). */
export const PHOTOGRAPHER_SEARCH_PAGE_SIZE = 20

export const eventPhotographerIdSchema = z.uuid()

/** What the admin can edit on an existing assignment. Role and the photographer are the assignment's identity. */
export const assignmentDetailsSchema = z.object({
  accreditation: z.enum(ACCREDITATIONS).default("UNKNOWN"),
  description: optionalText(500),
})

export const assignmentCreateSchema = assignmentDetailsSchema.extend({
  eventEditionId: z.uuid("Edition not found."),
  providerId: z.uuid("Select a photographer."),
})

export const photographerSearchSchema = z.object({
  eventEditionId: z.uuid(),
  q: z.string().transform(clean).pipe(z.string().max(100)).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
})

export type AssignmentDetailsInput = z.output<typeof assignmentDetailsSchema>
export type AssignmentCreateInput = z.output<typeof assignmentCreateSchema>
export type PhotographerSearchInput = z.output<typeof photographerSearchSchema>
