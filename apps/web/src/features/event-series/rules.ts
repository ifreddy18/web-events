import { generateSlug } from "@/lib/slug"
import type { EventSeriesInput } from "./schemas"

export type Assignment = { organizerId: string; role: "PRIMARY" | "CO_ORGANIZER" }

/** Slug used when the admin leaves it empty: derived from the name. */
export function resolveSeriesSlug(input: Pick<EventSeriesInput, "slug" | "name">) {
  return input.slug || generateSlug(input.name) || null
}

export function desiredAssignments(input: Pick<EventSeriesInput, "primaryOrganizerId" | "coOrganizerIds">): Assignment[] {
  return [
    { organizerId: input.primaryOrganizerId, role: "PRIMARY" },
    ...input.coOrganizerIds.map((organizerId) => ({ organizerId, role: "CO_ORGANIZER" as const })),
  ]
}

/**
 * Minimal change set turning `current` assignments into `desired`. Applying order matters
 * (the DB allows one PRIMARY): remove, demote, promote, then add.
 */
export function diffAssignments(current: Assignment[], desired: Assignment[]) {
  const have = new Map(current.map((a) => [a.organizerId, a.role]))
  const want = new Map(desired.map((a) => [a.organizerId, a.role]))
  const remove = current.filter((a) => !want.has(a.organizerId)).map((a) => a.organizerId)
  const demote = desired.filter((a) => a.role === "CO_ORGANIZER" && have.get(a.organizerId) === "PRIMARY").map((a) => a.organizerId)
  const promote = desired.filter((a) => a.role === "PRIMARY" && have.has(a.organizerId) && have.get(a.organizerId) !== "PRIMARY").map((a) => a.organizerId)
  const add = desired.filter((a) => !have.has(a.organizerId))
  return { remove, demote, promote, add }
}
