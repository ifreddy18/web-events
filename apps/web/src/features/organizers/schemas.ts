import { z } from "zod"
import { generateSlug } from "@/lib/slug"

const clean = (value: string) => value.trim().replace(/\s+/g, " ")

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters.`)
    .optional()
    .transform((v) => clean(v ?? "") || null)

const optionalUrl = (label: string) =>
  z
    .string()
    .max(500, "Must be at most 500 characters.")
    .optional()
    .transform((v, ctx) => {
      const raw = (v ?? "").trim()
      if (raw === "") return null
      try {
        const url = new URL(raw)
        if (url.protocol === "http:" || url.protocol === "https:") return url.toString()
      } catch {}
      ctx.addIssue({ code: "custom", message: `${label} must be a valid http(s) URL.` })
      return z.NEVER
    })

/** Accepts "@handle", "handle" or an instagram.com profile URL; stores the bare handle. */
const instagramHandle = z
  .string()
  .max(200, "Must be at most 200 characters.")
  .optional()
  .transform((v, ctx) => {
    let raw = (v ?? "").trim()
    if (raw === "") return null
    raw = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "")
    if (!/^[A-Za-z0-9._]{1,30}$/.test(raw)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Instagram handle." })
      return z.NEVER
    }
    return raw.toLowerCase()
  })

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
