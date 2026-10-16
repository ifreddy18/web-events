import type { ACCREDITATIONS } from "./schemas"

export type Accreditation = (typeof ACCREDITATIONS)[number]

/**
 * Labels and help for `EventServiceProvider.accreditation`. The schema only names the three values and states that
 * the same photographer may be OFFICIAL in one edition and INDEPENDENT in another, so the wording describes the
 * recorded designation for this edition and nothing more (no accreditation process or permissions are modelled).
 */
export const ACCREDITATION_DETAILS: Record<Accreditation, { label: string; help: string }> = {
  UNKNOWN: { label: "Not specified", help: "It is not recorded whether the photographer was official or independent at this edition." },
  OFFICIAL: { label: "Official", help: "Recorded as an official photographer of this edition." },
  INDEPENDENT: { label: "Independent", help: "Recorded as covering this edition independently, not as an official photographer." },
}

/** A leading "@" is not part of the stored Instagram handle, so it is ignored when searching. */
export function normalizePhotographerSearchTerm(term: string) {
  return term.trim().replace(/^@+/, "")
}
