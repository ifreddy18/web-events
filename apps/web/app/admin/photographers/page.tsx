import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhotographersTable } from "@/features/photographers/components/photographers-table"
import { listDisciplineOptions, listPhotographers } from "@/features/photographers/queries"

export const metadata = { title: "Photographers" }

const NOTICES: Record<string, string> = {
  created: "Photographer created.",
  updated: "Photographer updated.",
  deleted: "Photographer deleted.",
}

type SearchParams = Promise<Record<"q" | "page" | "notice" | "disciplineId", string | string[] | undefined>>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const selectClass = "h-9 rounded-md border border-input bg-transparent px-3 text-sm"

export default async function PhotographersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const [{ items, total, page, pageCount, q, disciplineId }, disciplines] = await Promise.all([
    listPhotographers({ q: first(sp.q), page: first(sp.page), disciplineId: first(sp.disciplineId) }),
    listDisciplineOptions(),
  ])
  const notice = NOTICES[first(sp.notice) ?? ""]
  const filtered = !!(q || disciplineId)
  const href = (p: number) =>
    `/admin/photographers?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(disciplineId ? { disciplineId } : {}),
      page: String(p),
    })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Photographers</h1>
        <Button asChild>
          <Link href="/admin/photographers/new">New photographer</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/photographers" role="search" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, Instagram, website, email, city…"
          aria-label="Search photographers"
          className="max-w-md min-w-48 flex-1"
        />
        <select name="disciplineId" defaultValue={disciplineId ?? ""} aria-label="Filter by discipline" className={selectClass}>
          <option value="">All disciplines</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.sportName} · {d.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {filtered && (
          <Button variant="ghost" asChild>
            <Link href="/admin/photographers">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filtered ? "No photographers match these filters." : "No photographers yet. Create the first one."}
        </div>
      ) : (
        <PhotographersTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} photographer{total === 1 ? "" : "s"} · page {page} of {pageCount}
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
