import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CompetitionsTable } from "@/features/competitions/components/competitions-table"
import { listCompetitions, listDisciplineOptions, listEditionOptions } from "@/features/competitions/queries"

export const metadata = { title: "Competitions" }

const NOTICES: Record<string, string> = {
  created: "Competition created.",
  updated: "Competition updated.",
  deleted: "Competition deleted.",
}

type SearchParams = Promise<Record<"q" | "page" | "notice" | "status" | "participationType" | "eventEditionId" | "disciplineId", string | string[] | undefined>>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm"

export default async function CompetitionsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const [list, editionOptions, disciplineOptions] = await Promise.all([
    listCompetitions({
      q: first(sp.q),
      page: first(sp.page),
      status: first(sp.status),
      participationType: first(sp.participationType),
      eventEditionId: first(sp.eventEditionId),
      disciplineId: first(sp.disciplineId),
    }),
    listEditionOptions(),
    listDisciplineOptions(),
  ])
  const { items, total, page, pageCount, q, status, participationType, eventEditionId, disciplineId } = list
  const notice = NOTICES[first(sp.notice) ?? ""]
  const filtered = !!(q || status || participationType || eventEditionId || disciplineId)
  const href = (p: number) =>
    `/admin/competitions?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(participationType ? { participationType } : {}),
      ...(eventEditionId ? { eventEditionId } : {}),
      ...(disciplineId ? { disciplineId } : {}),
      page: String(p),
    })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Competitions</h1>
        <Button asChild>
          <Link href="/admin/competitions/new">New competition</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/competitions" role="search" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, edition, series, discipline, location…"
          aria-label="Search competitions"
          className="max-w-md min-w-48 flex-1"
        />
        <select name="eventEditionId" defaultValue={eventEditionId ?? ""} aria-label="Filter by edition" className={selectClass}>
          <option value="">All editions</option>
          {editionOptions.map((edition) => (
            <option key={edition.id} value={edition.id}>
              {edition.label}
            </option>
          ))}
        </select>
        <select name="disciplineId" defaultValue={disciplineId ?? ""} aria-label="Filter by discipline" className={selectClass}>
          <option value="">All disciplines</option>
          {disciplineOptions.map((discipline) => (
            <option key={discipline.id} value={discipline.id}>
              {discipline.label}
            </option>
          ))}
        </select>
        <select name="participationType" defaultValue={participationType ?? ""} aria-label="Filter by participation" className={selectClass}>
          <option value="">Any participation</option>
          <option value="COMPETITIVE">Competitive</option>
          <option value="RECREATIONAL">Recreational</option>
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className={selectClass}>
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/admin/competitions">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filtered ? "No competitions match these filters." : "No competitions yet. Create the first one."}
        </div>
      ) : (
        <CompetitionsTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} competition(s) · page {page} of {pageCount}
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
