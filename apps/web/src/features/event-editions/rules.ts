import { generateSlug } from "@/lib/slug"
import type { LocalDate, LocalDateTime, LocalTime } from "@/shared/local-date"

// Pure EventEdition business rules (schema_v2_2_decisions.md items 1, 3 and 5). Publication, lifecycle and
// registration status are independent and deliberately have no rules here: any combination is valid
// (e.g. published with open registration and no URL, since people may register by WhatsApp or in person).
// `year` is the edition's identity, not a date: it is never compared with `startsOn`, so an edition announced
// for 2026 and postponed to 2027 keeps year 2026.
// Dates and times are LocalDate / LocalTime strings, which compare correctly with < and >. The date/time
// checks mirror the CHECK constraints in the migration so users get field errors instead of a database error.

export interface EditionRuleInput {
  startsOn: LocalDate | null
  endsOn: LocalDate | null
  startTime: LocalTime | null
  endTime: LocalTime | null
  rescheduledFromOn: LocalDate | null
  /** Wall-clock values in the edition's time zone. */
  registrationOpenAt: LocalDateTime | null
  registrationCloseAt: LocalDateTime | null
  status: "SCHEDULED" | "POSTPONED" | "COMPLETED" | "CANCELLED"
}

export interface EditionRuleIssue {
  field: keyof EditionRuleInput
  message: string
}

/** Returns every violated rule; an empty array means the edition can be saved. */
export function validateEditionRules(edition: EditionRuleInput): EditionRuleIssue[] {
  const issues: EditionRuleIssue[] = []
  const add = (field: keyof EditionRuleInput, message: string) => issues.push({ field, message })
  const { startsOn, endsOn, startTime, endTime } = edition

  // TBA editions have no dates at all: an end date or a time of day is meaningless without a start date.
  if (startsOn === null) {
    if (endsOn !== null) add("endsOn", "An end date requires a start date.")
    if (startTime !== null) add("startTime", "A start time requires a start date.")
    if (endTime !== null) add("endTime", "An end time requires a start date.")
    if (edition.status === "COMPLETED") add("status", "A completed edition needs a start date.")
  } else {
    if (endsOn !== null && endsOn < startsOn) add("endsOn", "The end date cannot be before the start date.")
    // ends_on is inclusive; on a single day the end time cannot precede the start time.
    // An overnight event must set a later end date instead.
    const spansSeveralDays = endsOn !== null && endsOn > startsOn
    if (startTime !== null && endTime !== null && !spansSeveralDays && endTime < startTime) {
      add("endTime", "The end time cannot be before the start time. For an overnight event set a later end date.")
    }
  }

  if (edition.rescheduledFromOn !== null && edition.rescheduledFromOn === startsOn) {
    add("rescheduledFromOn", "The original date must differ from the current start date.")
  }

  const { registrationOpenAt, registrationCloseAt } = edition
  if (registrationOpenAt !== null && registrationCloseAt !== null && registrationCloseAt < registrationOpenAt) {
    add("registrationCloseAt", "Registration cannot close before it opens.")
  }

  return issues
}

/**
 * Slug used when the admin leaves it empty. It combines name, label and year so that several
 * editions of one series in the same year get different slugs; parts already in the name are not
 * repeated. The result may still collide: callers must report that, never append a suffix.
 */
export function deriveEditionSlug(edition: { name: string; label: string | null; year: number }) {
  const nameWords = new Set(generateSlug(edition.name).split("-"))
  const missingFromName = (text: string) => !generateSlug(text).split("-").every((word) => nameWords.has(word))
  const parts = [edition.name]
  if (edition.label && missingFromName(edition.label)) parts.push(edition.label)
  if (missingFromName(String(edition.year))) parts.push(String(edition.year))
  return generateSlug(parts.join(" ")).slice(0, 150).replace(/-+$/, "") || null
}

/** Case-insensitive key that tells two editions of the same series and year apart. */
export function editionIdentityLabel(label: string | null) {
  return (label ?? "").trim().toLowerCase()
}
