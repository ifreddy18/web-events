import { z } from "zod"
import { generateSlug } from "@/lib/slug"
import { isCountryCode } from "@/shared/countries"
import { clean, instagramHandle, optionalEmail, optionalText, optionalUrl } from "@/shared/field-schemas"

const optionalPhone = z
  .string()
  .max(40, "Must be at most 40 characters.")
  .optional()
  .transform((value, ctx) => {
    const phone = clean(value ?? "")
    if (phone === "") return null
    if (/^\+?[\d\s().-]{6,}$/.test(phone) && /\d{6,}/.test(phone.replace(/\D/g, ""))) return phone
    ctx.addIssue({ code: "custom", message: "Enter a valid phone number." })
    return z.NEVER
  })

const optionalCountryCode = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const code = (value ?? "").trim().toUpperCase()
    if (code === "") return null
    if (isCountryCode(code)) return code
    ctx.addIssue({ code: "custom", message: "Select a country from the list." })
    return z.NEVER
  })

/**
 * Photographer profile as submitted by the admin form. Every contact channel is optional on purpose:
 * Instagram-only photographers are valid, and so is a profile with no contact data at all.
 */
export const photographerInputSchema = z.object({
  // A studio or team name is as valid as a person's name; names are not unique.
  name: z.string().transform(clean).pipe(z.string().min(1, "Name is required.").max(150, "Must be at most 150 characters.")),
  // Empty means "derive from the name" (and pick a free suffix when the name is taken).
  slug: z
    .string()
    .max(150, "Must be at most 150 characters.")
    .optional()
    .transform((value) => generateSlug(value ?? "") || null),
  description: optionalText(2000),
  instagram: instagramHandle,
  website: optionalUrl("Website"),
  email: optionalEmail,
  phone: optionalPhone,
  profileImageUrl: optionalUrl("Profile image URL"),
  city: optionalText(100),
  countryCode: optionalCountryCode,
  disciplineIds: z
    .array(z.uuid("Select valid disciplines."))
    .max(100, "Select at most 100 disciplines.")
    .default([])
    .transform((ids) => [...new Set(ids)]),
})

export type PhotographerInput = z.output<typeof photographerInputSchema>

export const photographerIdSchema = z.uuid()

export const photographerListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  disciplineId: z.uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
})

export const PHOTOGRAPHERS_PAGE_SIZE = 20
