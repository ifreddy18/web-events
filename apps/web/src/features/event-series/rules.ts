import { generateSlug } from "@/lib/slug"
import type { EventSeriesInput } from "./schemas"

export { desiredAssignments, diffAssignments, type Assignment } from "@/shared/organizer-assignments"

/** Slug used when the admin leaves it empty: derived from the name. */
export function resolveSeriesSlug(input: Pick<EventSeriesInput, "slug" | "name">) {
  return input.slug || generateSlug(input.name) || null
}
