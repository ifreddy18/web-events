import { z } from "zod"
import { isLocalDate, isLocalTime } from "@/shared/local-date"

// Text field normalizers shared by admin feature schemas.

export const clean = (value: string) => value.trim().replace(/\s+/g, " ")

export const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters.`)
    .optional()
    .transform((v) => clean(v ?? "") || null)

export const optionalUrl = (label: string) =>
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
export const instagramHandle = z
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

/** Empty input means "not set" (TBA); anything else must be a real calendar date. */
export const optionalLocalDate = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim()
    if (raw === "") return null
    if (isLocalDate(raw)) return raw
    ctx.addIssue({ code: "custom", message: "Use a valid date." })
    return z.NEVER
  })

export const optionalLocalTime = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim()
    if (raw === "") return null
    if (isLocalTime(raw)) return raw
    ctx.addIssue({ code: "custom", message: "Use a valid time (HH:mm)." })
    return z.NEVER
  })

export const optionalUuid = (message: string) =>
  z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim() || null)
    .pipe(z.uuid(message).nullable())

