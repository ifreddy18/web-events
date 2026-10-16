// Time zone choices for the admin forms. The stored value is always an IANA identifier
// (e.g. "America/Caracas"); the offset in the label is display only and is never stored,
// because offsets change with daylight saving time and political decisions.

export type SelectOption = { value: string; label: string }
export type SelectGroup = { heading: string; options: SelectOption[] }

/** Zones admins pick most often, in the order they are offered. Venezuela first. */
export const PRIORITY_TIME_ZONES = [
  "America/Caracas",
  "America/Bogota",
  "America/Lima",
  "America/Guayaquil",
  "America/La_Paz",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/Sao_Paulo",
  "America/Panama",
  "America/Costa_Rica",
  "America/Guatemala",
  "America/El_Salvador",
  "America/Tegucigalpa",
  "America/Managua",
  "America/Mexico_City",
  "America/Havana",
  "America/Santo_Domingo",
  "America/Puerto_Rico",
] as const

/** All IANA zones the runtime knows, or an empty list on engines without `Intl.supportedValuesOf`. */
function supportedTimeZones(): string[] {
  return typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []
}

/** "GMT-04:00" style offset in effect now; empty when the runtime cannot format it. */
function currentOffsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(new Date())
    return parts.find((part) => part.type === "timeZoneName")?.value ?? ""
  } catch {
    return ""
  }
}

export function timeZoneOption(timeZone: string): SelectOption {
  const offset = currentOffsetLabel(timeZone)
  return { value: timeZone, label: `${timeZone.replaceAll("_", " ")}${offset ? ` (${offset})` : ""}` }
}

/**
 * Option groups for the time zone selector. `currentValue` is the zone already stored on the record:
 * it is always offered, even when the runtime does not list it (aliases such as "UTC"), so editing
 * never changes or hides a saved value.
 */
export function buildTimeZoneGroups(currentValue?: string): SelectGroup[] {
  const supported = supportedTimeZones()
  const priority = new Set<string>(PRIORITY_TIME_ZONES)
  const groups: SelectGroup[] = []

  const isListed = currentValue && (priority.has(currentValue) || supported.includes(currentValue))
  if (currentValue && !isListed) groups.push({ heading: "Current value", options: [timeZoneOption(currentValue)] })

  groups.push({ heading: "Latin America", options: PRIORITY_TIME_ZONES.map(timeZoneOption) })
  groups.push({ heading: "All time zones", options: supported.filter((zone) => !priority.has(zone)).map(timeZoneOption) })
  return groups
}
