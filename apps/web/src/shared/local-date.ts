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
