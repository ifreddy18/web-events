import { generateSlug } from "@/lib/slug"
import type { PhotographerInput } from "./schemas"

/**
 * A ServiceProvider is a photographer when it is linked to the ServiceProviderType with this slug
 * (seeded by `pnpm db:seed`). There is no separate Photographer model or role column.
 */
export const PHOTOGRAPHER_TYPE_SLUG = "photographer"

/** Slug base used when the admin leaves the slug empty: derived from the name. */
export function resolvePhotographerSlugBase(input: Pick<PhotographerInput, "slug" | "name">) {
  return input.slug || generateSlug(input.name) || null
}

/** `base`, `base-2`, `base-3`… the first candidate that is not in `taken`. */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>) {
  if (!taken.has(base)) return base
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Minimal change set turning the currently assigned discipline ids into the desired ones. */
export function diffDisciplineIds(current: readonly string[], desired: readonly string[]) {
  const have = new Set(current)
  const want = new Set(desired)
  return {
    remove: current.filter((id) => !want.has(id)),
    add: desired.filter((id) => !have.has(id)),
  }
}
