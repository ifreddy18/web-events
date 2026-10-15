// Date-only and time-of-day values are plain strings end to end:
//   LocalDate "YYYY-MM-DD", LocalTime "HH:mm". Never build them from `new Date()`
//   in local time or call toISOString() on them (UTC shifts the calendar day).
// Strings of these formats compare correctly with < and >.

export type LocalDate = string
export type LocalTime = string

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isLocalDate(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(y, mo - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
}

export function isLocalTime(value: string): boolean {
  return TIME_RE.test(value)
}

/** Prisma returns `@db.Date` columns as a Date at UTC midnight: read it with UTC getters. */
export function localDateFromDb(value: Date | null | undefined): LocalDate | null {
  if (!value) return null
  const y = String(value.getUTCFullYear()).padStart(4, "0")
  const m = String(value.getUTCMonth() + 1).padStart(2, "0")
  const d = String(value.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Inverse of `localDateFromDb`, for writes to `@db.Date` columns. */
export function localDateToDb(value: LocalDate): Date {
  if (!isLocalDate(value)) throw new RangeError(`Invalid local date: ${value}`)
  return new Date(`${value}T00:00:00.000Z`)
}

// --- Instants entered as a local wall-clock time in a named IANA time zone -------------------
// Used for values stored as timestamps (e.g. EventEdition.registrationOpenAt) but typed by the
// admin as "the clock on the wall at the event". Conversion goes through Intl, never through the
// server's or browser's own time zone.

/** "YYYY-MM-DDTHH:mm", the value format of an HTML `datetime-local` input without seconds. */
export type LocalDateTime = string

export function isLocalDateTime(value: string): boolean {
  const [date, time, ...rest] = value.split("T")
  return rest.length === 0 && time !== undefined && isLocalDate(date) && isLocalTime(time)
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

function zonedParts(instant: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) => {
    const found = formatted.find((p) => p.type === type)
    if (!found) throw new Error(`Missing ${type} in formatted date`)
    return found.value
  }
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  }
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const wallClockAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  const instantWithoutMillis = instant.getTime() - instant.getUTCMilliseconds()
  return (wallClockAsUtc - instantWithoutMillis) / 60_000
}

/** The instant at which the wall clock in `timeZone` shows `value`. */
export function zonedDateTimeToInstant(value: LocalDateTime, timeZone: string): Date {
  if (!isLocalDateTime(value)) throw new RangeError(`Invalid local date-time: ${value}`)
  const [date, time] = value.split("T")
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  // The offset depends on the instant itself, so refine once from the first estimate
  // (needed only around DST changes; fixed-offset zones converge immediately).
  const firstEstimate = wallClockAsUtc - offsetMinutes(new Date(wallClockAsUtc), timeZone) * 60_000
  return new Date(wallClockAsUtc - offsetMinutes(new Date(firstEstimate), timeZone) * 60_000)
}

/** Inverse of `zonedDateTimeToInstant`, for pre-filling form inputs. */
export function instantToZonedDateTime(instant: Date | null | undefined, timeZone: string): LocalDateTime | null {
  if (!instant) return null
  const p = zonedParts(instant, timeZone)
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
