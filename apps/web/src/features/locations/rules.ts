import { generateSlug } from "@/lib/slug"
import type { LocationInput } from "./schemas"

/** Slug used when the admin leaves it empty: most specific name parts first. */
export function resolveLocationSlug(input: Pick<LocationInput, "slug" | "venueName" | "city" | "state" | "country">) {
  if (input.slug) return input.slug
  const derived = generateSlug([input.venueName, input.city, input.state, input.country].filter(Boolean).join(" "))
  return derived || null
}

export function formatLocationLabel(l: { venueName: string | null; city: string | null; state: string | null; country: string }) {
  return [l.venueName, l.city, l.state, l.country].filter(Boolean).join(", ")
}
