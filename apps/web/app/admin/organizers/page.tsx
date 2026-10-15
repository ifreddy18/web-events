import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrganizersTable } from "@/features/organizers/components/organizers-table"
import { listOrganizers } from "@/features/organizers/queries"

export const metadata = { title: "Organizers" }

const NOTICES: Record<string, string> = {
  created: "Organizer created.",
  updated: "Organizer updated.",
  deleted: "Organizer deleted.",
}

type SearchParams = Promise<{ q?: string | string[]; page?: string | string[]; notice?: string | string[] }>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function OrganizersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const { items, total, page, pageCount, q } = await listOrganizers({ q: first(sp.q), page: first(sp.page) })
  const notice = NOTICES[first(sp.notice) ?? ""]
  const href = (p: number) => `/admin/organizers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Organizers</h1>
        <Button asChild>
          <Link href="/admin/organizers/new">New organizer</Link>
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form action="/admin/organizers" role="search" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name, slug, Instagram, website…" aria-label="Search organizers" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Button variant="ghost" asChild>
            <Link href="/admin/organizers">Clear</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q ? `No organizers match “${q}”.` : "No organizers yet. Create the first one."}
        </div>
      ) : (
        <OrganizersTable items={items} />
      )}

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} organizer{total === 1 ? "" : "s"} · page {page} of {pageCount}
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
