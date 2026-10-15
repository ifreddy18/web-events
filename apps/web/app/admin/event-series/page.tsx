import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventSeriesTable } from "@/features/event-series/components/event-series-table"
import { listDisciplineOptions, listEventSeries } from "@/features/event-series/queries"

export const metadata = { title: "Event series" }

const NOTICES: Record<string, string> = {
  created: "Series created.",
  updated: "Series updated.",
  deleted: "Series deleted.",
}

type SearchParams = Promise<Record<"q" | "page" | "notice" | "status" | "disciplineId", string | string[] | undefined>>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm"

export default async function EventSeriesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const [{ items, total, page, pageCount, q, status, disciplineId }, disciplines] = await Promise.all([
    listEventSeries({ q: first(sp.q), page: first(sp.page), status: first(sp.status), disciplineId: first(sp.disciplineId) }),
    listDisciplineOptions(),
  ])
  const notice = NOTICES[first(sp.notice) ?? ""]
  const filtered = !!(q || status || disciplineId)
  const href = (p: number) =>
    `/admin/event-series?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(disciplineId ? { disciplineId } : {}),
      page: String(p),
    })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Event series</h1>
        <Button asChild>
          <Link href="/admin/event-series/new">New series</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/event-series" role="search" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, discipline, organizer…"
          aria-label="Search series"
          className="max-w-md min-w-48 flex-1"
        />
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className={selectClass}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select name="disciplineId" defaultValue={disciplineId ?? ""} aria-label="Filter by discipline" className={selectClass}>
          <option value="">All disciplines</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/admin/event-series">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filtered ? "No series match these filters." : "No series yet. Create the first one."}
        </div>
      ) : (
        <EventSeriesTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} series · page {page} of {pageCount}
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
