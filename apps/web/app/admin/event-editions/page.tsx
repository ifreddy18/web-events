import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventEditionsTable } from "@/features/event-editions/components/event-editions-table"
import { listEventEditions, listSeriesFilterOptions } from "@/features/event-editions/queries"

export const metadata = { title: "Event editions" }

const NOTICES: Record<string, string> = {
  created: "Edition created.",
  updated: "Edition updated.",
  deleted: "Edition deleted.",
}

type SearchParams = Promise<
  Record<"q" | "page" | "notice" | "year" | "status" | "publicationStatus" | "registrationStatus" | "eventSeriesId", string | string[] | undefined>
>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm"

export default async function EventEditionsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const [list, seriesOptions] = await Promise.all([
    listEventEditions({
      q: first(sp.q),
      page: first(sp.page),
      year: first(sp.year),
      status: first(sp.status),
      publicationStatus: first(sp.publicationStatus),
      registrationStatus: first(sp.registrationStatus),
      eventSeriesId: first(sp.eventSeriesId),
    }),
    listSeriesFilterOptions(),
  ])
  const { items, total, page, pageCount, q, year, status, publicationStatus, registrationStatus, eventSeriesId } = list
  const notice = NOTICES[first(sp.notice) ?? ""]
  const filtered = !!(q || year || status || publicationStatus || registrationStatus || eventSeriesId)
  const href = (p: number) =>
    `/admin/event-editions?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(year ? { year: String(year) } : {}),
      ...(status ? { status } : {}),
      ...(publicationStatus ? { publicationStatus } : {}),
      ...(registrationStatus ? { registrationStatus } : {}),
      ...(eventSeriesId ? { eventSeriesId } : {}),
      page: String(p),
    })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Event editions</h1>
        <Button asChild>
          <Link href="/admin/event-editions/new">New edition</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/event-editions" role="search" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, series, location, organizer…"
          aria-label="Search editions"
          className="max-w-md min-w-48 flex-1"
        />
        <select name="eventSeriesId" defaultValue={eventSeriesId ?? ""} aria-label="Filter by series" className={selectClass}>
          <option value="">All series</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input name="year" type="number" defaultValue={year ?? ""} placeholder="Year" aria-label="Filter by year" className="w-24" />
        <select name="publicationStatus" defaultValue={publicationStatus ?? ""} aria-label="Filter by publication" className={selectClass}>
          <option value="">Any publication</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by event status" className={selectClass}>
          <option value="">Any event status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="POSTPONED">Postponed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select name="registrationStatus" defaultValue={registrationStatus ?? ""} aria-label="Filter by registration" className={selectClass}>
          <option value="">Any registration</option>
          <option value="UNKNOWN">Unknown</option>
          <option value="NOT_OPEN">Not open</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="SOLD_OUT">Sold out</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/admin/event-editions">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filtered ? "No editions match these filters." : "No editions yet. Create the first one."}
        </div>
      ) : (
        <EventEditionsTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} edition(s) · page {page} of {pageCount}
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
