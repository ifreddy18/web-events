import { z } from "zod"
import { generateSlug } from "@/lib/slug"
import { clean, instagramHandle, optionalText, optionalUrl } from "@/shared/field-schemas"

export const organizerInputSchema = z.object({
  name: z.string().transform(clean).pipe(z.string().min(1, "Name is required.").max(150, "Must be at most 150 characters.")),
  // Empty means "derive from the name"; never silently suffixed.
  slug: z
    .string()
    .max(150, "Must be at most 150 characters.")
    .optional()
    .transform((v) => generateSlug(v ?? "") || null),
  description: optionalText(2000),
  website: optionalUrl("Website"),
  instagram: instagramHandle,
  logoUrl: optionalUrl("Logo URL"),
})

export type OrganizerInput = z.output<typeof organizerInputSchema>

export const organizerIdSchema = z.uuid()

export const organizerListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
})

export const ORGANIZERS_PAGE_SIZE = 20
