"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchEditionPhotographerCandidates } from "../actions"
import type { PhotographerSearchItem } from "../queries"

type SearchState = {
  items: PhotographerSearchItem[]
  total: number
  page: number
  hasMore: boolean
  status: "loading" | "ready" | "error"
}

const SEARCH_DEBOUNCE_MS = 300

/** Same-name photographers are told apart by Instagram, place and finally the unique profile slug. */
export const describePhotographer = (photographer: Pick<PhotographerSearchItem, "instagram" | "city" | "countryCode" | "slug">) =>
  [photographer.instagram ? `@${photographer.instagram}` : "No Instagram", [photographer.city, photographer.countryCode].filter(Boolean).join(", ") || null]
    .filter(Boolean)
    .join(" · ") + ` · ${photographer.slug}`

/**
 * Searchable single-choice list of active photographers. Searching happens on the server (name or Instagram) a page
 * at a time, so the list is never capped to an arbitrary number of rows. Photographers already assigned to the
 * edition are shown but disabled. It is a native radio group, which keeps keyboard and screen reader behaviour free.
 */
export function PhotographerPicker({
  eventEditionId,
  selected,
  onSelect,
}: {
  eventEditionId: string
  selected: PhotographerSearchItem | null
  onSelect: (photographer: PhotographerSearchItem) => void
}) {
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState<SearchState>({ items: [], total: 0, page: 1, hasMore: false, status: "loading" })
  const latestRequest = useRef(0)

  async function load(term: string, page: number) {
    const request = ++latestRequest.current
    setSearch((current) => ({ ...current, status: "loading" }))
    let result: Awaited<ReturnType<typeof searchEditionPhotographerCandidates>>
    try {
      result = await searchEditionPhotographerCandidates({ eventEditionId, q: term, page })
    } catch {
      result = { ok: false, error: { code: "conflict", message: "Search failed." } }
    }
    if (request !== latestRequest.current) return // a newer search superseded this one
    if (!result.ok) {
      setSearch((current) => ({ ...current, status: "error" }))
      return
    }
    const { items, total, hasMore } = result.data
    setSearch((current) => ({ items: page === 1 ? items : [...current.items, ...items], total, page, hasMore, status: "ready" }))
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(query, 1), query === "" ? 0 : SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // `load` only closes over the edition id and the stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, eventEditionId])

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label htmlFor="photographer-search" className="text-sm font-medium">
          Search photographers
        </label>
        <Input
          id="photographer-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or Instagram"
          autoComplete="off"
          aria-describedby="photographer-search-hint"
        />
        <p id="photographer-search-hint" className="text-xs text-muted-foreground">
          Matches part of a name or Instagram handle. Photographers without Instagram are included.
        </p>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {search.status === "loading" && search.items.length === 0 && "Searching…"}
        {search.status === "error" && "The search failed. Try again."}
        {search.status === "ready" && (search.total === 0 ? "No photographers match." : `${search.total} photographer${search.total === 1 ? "" : "s"} found.`)}
      </p>

      {search.items.length > 0 && (
        <fieldset className="max-h-64 divide-y overflow-y-auto rounded-md border">
          <legend className="sr-only">Photographer to add</legend>
          {search.items.map((photographer) => {
            const inputId = `photographer-option-${photographer.id}`
            return (
              <label
                key={photographer.id}
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-3 p-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:checked]:bg-muted"
              >
                <input
                  id={inputId}
                  type="radio"
                  name="providerId"
                  value={photographer.id}
                  checked={selected?.id === photographer.id}
                  disabled={photographer.alreadyAssigned}
                  onChange={() => onSelect(photographer)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{photographer.name}</span>
                  <span className="block break-words text-xs text-muted-foreground">{describePhotographer(photographer)}</span>
                  {photographer.alreadyAssigned && <span className="block text-xs">Already in this edition</span>}
                </span>
              </label>
            )
          })}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {search.hasMore && (
          <Button type="button" variant="outline" size="sm" disabled={search.status === "loading"} onClick={() => void load(query, search.page + 1)}>
            Show more
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={search.status === "loading"} onClick={() => void load(query, 1)}>
          Refresh results
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Photographer not listed? Profiles are created in{" "}
        <Link href="/admin/photographers" target="_blank" rel="noreferrer" className="underline">
          Photographers (opens in a new tab)
        </Link>
        ; then refresh the results here.
      </p>
    </div>
  )
}
