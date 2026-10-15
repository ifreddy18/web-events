import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationsTable } from "@/features/locations/components/locations-table"
import { listLocations } from "@/features/locations/queries"

export const metadata = { title: "Locations" }

const NOTICES: Record<string, string> = {
  created: "Location created.",
  updated: "Location updated.",
  deleted: "Location deleted.",
}

type SearchParams = Promise<{ q?: string | string[]; page?: string | string[]; notice?: string | string[] }>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function LocationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const { items, total, page, pageCount, q } = await listLocations({ q: first(sp.q), page: first(sp.page) })
  const notice = NOTICES[first(sp.notice) ?? ""]
  const href = (p: number) => `/admin/locations?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <Button asChild>
          <Link href="/admin/locations/new">New location</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/locations" role="search" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search venue, city, state, country, address…" aria-label="Search locations" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Button variant="ghost" asChild>
            <Link href="/admin/locations">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q ? `No locations match “${q}”.` : "No locations yet. Create the first one."}
        </div>
      ) : (
        <LocationsTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} location{total === 1 ? "" : "s"} · page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href(page - 1)}>Previous</Link>
            </Button>
          )}
          {page < pageCount && (
            <Button variant="outline" size="sm" asChild>
              <Link href={href(page + 1)}>Next</Link>
            </Button>
          )}
        </div>
      </nav>
    </div>
  )
}
