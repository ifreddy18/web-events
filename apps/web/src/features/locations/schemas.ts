import { z } from "zod"
import { generateSlug } from "@/lib/slug"

const clean = (value: string) => value.trim().replace(/\s+/g, " ")

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters.`)
    .optional()
    .transform((v) => clean(v ?? "") || null)

const coordinate = (label: string, min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      const raw = typeof v === "number" ? String(v) : (v ?? "").trim()
      if (raw === "") return null
      const n = Number(raw)
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${label} must be a number between ${min} and ${max}.` })
        return z.NEVER
      }
      return Math.round(n * 1e6) / 1e6
    })

export const locationInputSchema = z
  .object({
    country: z.string().transform(clean).pipe(z.string().min(1, "Country is required.").max(100)),
    state: optionalText(100),
    city: optionalText(100),
    venueName: optionalText(150),
    address: optionalText(250),
    // Empty means "derive from the other fields" (see rules.ts); never silently suffixed.
    slug: z
      .string()
      .max(150, "Must be at most 150 characters.")
      .optional()
      .transform((v) => generateSlug(v ?? "") || null),
    latitude: coordinate("Latitude", -90, 90),
    longitude: coordinate("Longitude", -180, 180),
  })
  .superRefine((v, ctx) => {
    if ((v.latitude === null) !== (v.longitude === null)) {
      ctx.addIssue({
        code: "custom",
        path: [v.latitude === null ? "latitude" : "longitude"],
        message: "Provide both latitude and longitude, or neither.",
      })
    }
  })

export type LocationInput = z.output<typeof locationInputSchema>

export const locationIdSchema = z.uuid()

export const locationListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
})

export const LOCATIONS_PAGE_SIZE = 20
