import { isLocalDate, isLocalTime, type LocalDate, type LocalTime } from "@/shared/local-date"

// Pure business rules from schema_v2_2_decisions.md, item 4. Used by create/update
// actions, display and queries. Inputs are LocalDate / LocalTime strings
// (convert Prisma DATE values with localDateFromDb first).
//
// Only dates and location are inherited. Competition times are overrides with
// no edition fallback.

export interface EditionSchedule {
  startsOn: LocalDate | null
  endsOn: LocalDate | null
  locationId: string | null
}

export interface CompetitionSchedule {
  startsOn: LocalDate | null
  endsOn: LocalDate | null
  startTime: LocalTime | null
  endTime: LocalTime | null
  locationId: string | null
}

export interface EffectiveSchedule {
  startsOn: LocalDate | null
  endsOn: LocalDate | null
  startTime: LocalTime | null
  endTime: LocalTime | null
  locationId: string | null
}

export function resolveEffectiveSchedule(
  edition: EditionSchedule,
  competition: CompetitionSchedule,
): EffectiveSchedule {
  const startsOn = competition.startsOn ?? edition.startsOn
  return {
    startsOn,
    // A multi-day competition must set endsOn itself; it never spans the edition implicitly.
    endsOn: competition.endsOn ?? startsOn,
    startTime: competition.startTime,
    endTime: competition.endTime,
    locationId: competition.locationId ?? edition.locationId,
  }
}

export type ScheduleIssueCode =
  | "invalid_date"
  | "invalid_time"
  | "missing_start_date"
  | "end_before_start"
  | "outside_edition"
  | "time_order"

export interface ScheduleIssue {
  field: "startsOn" | "endsOn" | "startTime" | "endTime"
  code: ScheduleIssueCode
  message: string
}

/** Returns every violated rule; an empty array means the schedule is valid. */
export function validateCompetitionSchedule(
  edition: EditionSchedule,
  competition: CompetitionSchedule,
): ScheduleIssue[] {
  const issues: ScheduleIssue[] = []
  const add = (field: ScheduleIssue["field"], code: ScheduleIssueCode, message: string) =>
    issues.push({ field, code, message })

  for (const field of ["startsOn", "endsOn"] as const) {
    const v = competition[field]
    if (v !== null && !isLocalDate(v)) add(field, "invalid_date", "Use a valid date (YYYY-MM-DD).")
  }
  for (const field of ["startTime", "endTime"] as const) {
    const v = competition[field]
    if (v !== null && !isLocalTime(v)) add(field, "invalid_time", "Use a valid time (HH:mm).")
  }
  // Ordering rules below compare strings; stop on malformed input.
  if (issues.length > 0) return issues

  const eff = resolveEffectiveSchedule(edition, competition)

  if (eff.startsOn === null) {
    if (competition.endsOn !== null) {
      add("endsOn", "missing_start_date", "An end date requires a start date (own or from the edition).")
    }
    if (competition.startTime !== null) {
      add("startTime", "missing_start_date", "A start time requires a start date (own or from the edition).")
    }
    if (competition.endTime !== null) {
      add("endTime", "missing_start_date", "An end time requires a start date (own or from the edition).")
    }
    return issues
  }

  if (eff.endsOn !== null && eff.endsOn < eff.startsOn) {
    add("endsOn", "end_before_start", "The end date cannot be before the start date.")
  }

  // Edition window is known only when the edition has a start date; its
  // effective end is endsOn ?? startsOn.
  if (edition.startsOn !== null) {
    const windowEnd = edition.endsOn ?? edition.startsOn
    if (eff.startsOn < edition.startsOn || eff.startsOn > windowEnd) {
      add("startsOn", "outside_edition", "The start date must fall within the edition dates.")
    }
    if (eff.endsOn !== null && (eff.endsOn > windowEnd || eff.endsOn < edition.startsOn)) {
      add("endsOn", "outside_edition", "The end date must fall within the edition dates.")
    }
  }

  const sameDay = eff.endsOn === eff.startsOn
  if (sameDay && eff.startTime !== null && eff.endTime !== null && eff.endTime < eff.startTime) {
    add("endTime", "time_order", "On a single-day competition the end time cannot be before the start time.")
  }

  return issues
}
