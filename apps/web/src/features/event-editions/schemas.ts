import { z } from "zod"
import { generateSlug } from "@/lib/slug"
import { clean, optionalText, optionalUrl } from "@/shared/field-schemas"
import { isLocalDate, isLocalDateTime, isLocalTime, isValidTimeZone } from "@/shared/local-date"
import { validateEditionRules } from "./rules"

export const PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED"] as const
export const EDITION_STATUSES = ["SCHEDULED", "POSTPONED", "COMPLETED", "CANCELLED"] as const
export const REGISTRATION_STATUSES = ["UNKNOWN", "NOT_OPEN", "OPEN", "CLOSED", "SOLD_OUT"] as const

export const DEFAULT_TIME_ZONE = "America/Caracas"
export const MIN_EDITION_YEAR = 1900
export const MAX_EDITION_YEAR = 2100

/** Empty input means "not set" (TBA); anything else must be a real calendar date. */
const optionalLocalDate = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim()
    if (raw === "") return null
    if (isLocalDate(raw)) return raw
    ctx.addIssue({ code: "custom", message: "Use a valid date." })
    return z.NEVER
  })

const optionalLocalTime = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim()
    if (raw === "") return null
    if (isLocalTime(raw)) return raw
    ctx.addIssue({ code: "custom", message: "Use a valid time (HH:mm)." })
    return z.NEVER
  })

/** Wall-clock date and time in the edition's time zone; seconds from the browser are dropped. */
const optionalLocalDateTime = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const raw = (value ?? "").trim().replace(/(T\d{2}:\d{2}):\d{2}(\.\d+)?$/, "$1")
    if (raw === "") return null
    if (isLocalDateTime(raw)) return raw
    ctx.addIssue({ code: "custom", message: "Use a valid date and time." })
    return z.NEVER
  })

const optionalUuid = (message: string) =>
  z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim() || null)
    .pipe(z.uuid(message).nullable())

const editionFields = {
  name: z.string().transform(clean).pipe(z.string().min(1, "Name is required.").max(150, "Must be at most 150 characters.")),
  // Empty means "derive from name, label and year"; it is never silently suffixed.
  slug: z
    .string()
    .max(150, "Must be at most 150 characters.")
    .optional()
    .transform((value) => generateSlug(value ?? "") || null),
  // Distinguishes several editions of one series in the same year (e.g. "Primavera", "II").
  label: optionalText(100),
  // Identity of the edition ("the 2026 edition"); independent of startsOn, which may move to another year.
  year: z.coerce
    .number<unknown>()
    .int("Enter a valid year.")
    .min(MIN_EDITION_YEAR, `Enter a year between ${MIN_EDITION_YEAR} and ${MAX_EDITION_YEAR}.`)
    .max(MAX_EDITION_YEAR, `Enter a year between ${MIN_EDITION_YEAR} and ${MAX_EDITION_YEAR}.`),
  startsOn: optionalLocalDate,
  endsOn: optionalLocalDate,
  startTime: optionalLocalTime,
  endTime: optionalLocalTime,
  timeZone: z
    .string()
    .optional()
    .transform((value) => clean(value ?? "") || DEFAULT_TIME_ZONE)
    .refine(isValidTimeZone, "Enter a valid IANA time zone (e.g. America/Caracas)."),
  rescheduledFromOn: optionalLocalDate,
  registrationOpenAt: optionalLocalDateTime,
  registrationCloseAt: optionalLocalDateTime,
  registrationStatus: z.enum(REGISTRATION_STATUSES).default("UNKNOWN"),
  registrationUrl: optionalUrl("Registration URL"),
  resultsUrl: optionalUrl("Results URL"),
  publicationStatus: z.enum(PUBLICATION_STATUSES).default("DRAFT"),
  status: z.enum(EDITION_STATUSES).default("SCHEDULED"),
  locationId: optionalUuid("Invalid location."),
  coOrganizerIds: z.array(z.uuid("Invalid organizer.")).max(20, "At most 20 co-organizers.").default([]),
}

type RuleCheckable = Parameters<typeof validateEditionRules>[0] & {
  primaryOrganizerId?: string | null
  coOrganizerIds: string[]
}

/** Cross-field checks; the date rules themselves live in `rules.ts`. */
function applyEditionRules(value: RuleCheckable, ctx: z.RefinementCtx) {
  for (const issue of validateEditionRules(value)) {
    ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message })
  }
  const organizerIds = [value.primaryOrganizerId, ...value.coOrganizerIds].filter(Boolean)
  if (new Set(organizerIds).size !== organizerIds.length) {
    ctx.addIssue({
      code: "custom",
      path: ["coOrganizerIds"],
      message: "An organizer can only be assigned once (the primary cannot also be a co-organizer).",
    })
  }
}

/** The series is fixed at creation, so updates do not accept `eventSeriesId`. */
export const eventEditionUpdateSchema = z
  .object({ ...editionFields, primaryOrganizerId: z.uuid("Select a primary organizer.") })
  .superRefine(applyEditionRules)

/**
 * `primaryOrganizerId` omitted (undefined) with no co-organizers means "copy the series' organizers".
 * An empty string is an explicit but incomplete selection and fails validation.
 */
export const eventEditionCreateSchema = z
  .object({
    ...editionFields,
    eventSeriesId: z.uuid("Select a series."),
    primaryOrganizerId: z.uuid("Select a primary organizer.").optional(),
  })
  .superRefine(applyEditionRules)
  .superRefine((value, ctx) => {
    if (value.primaryOrganizerId === undefined && value.coOrganizerIds.length > 0) {
      ctx.addIssue({ code: "custom", path: ["primaryOrganizerId"], message: "Select a primary organizer." })
    }
  })

export type EventEditionUpdateInput = z.output<typeof eventEditionUpdateSchema>
export type EventEditionCreateInput = z.output<typeof eventEditionCreateSchema>

export const eventEditionIdSchema = z.uuid()

export const eventEditionListParamsSchema = z.object({
  q: z.string().transform(clean).catch(""),
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  year: z.coerce.number().int().min(MIN_EDITION_YEAR).max(MAX_EDITION_YEAR).optional().catch(undefined),
  status: z.enum(EDITION_STATUSES).optional().catch(undefined),
  publicationStatus: z.enum(PUBLICATION_STATUSES).optional().catch(undefined),
  registrationStatus: z.enum(REGISTRATION_STATUSES).optional().catch(undefined),
  eventSeriesId: z.uuid().optional().catch(undefined),
})

export const EVENT_EDITIONS_PAGE_SIZE = 20
