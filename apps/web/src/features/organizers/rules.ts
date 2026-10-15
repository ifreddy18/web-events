import { generateSlug } from "@/lib/slug"
import type { OrganizerInput } from "./schemas"

/** Slug used when the admin leaves it empty: derived from the name. */
export function resolveOrganizerSlug(input: Pick<OrganizerInput, "slug" | "name">) {
  return input.slug || generateSlug(input.name) || null
}
