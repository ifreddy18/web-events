import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { listEventSeries } from "../queries"
import { DeleteEventSeriesButton } from "./delete-event-series-button"

type Result = Awaited<ReturnType<typeof listEventSeries>>

export function EventSeriesTable({ items }: { items: Result["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Discipline</TableHead>
            <TableHead className="hidden md:table-cell">Primary organizer</TableHead>
            <TableHead className="hidden lg:table-cell">Slug</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Editions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {s.sportName} · {s.disciplineName}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {s.primaryOrganizer ?? "—"}
                {s.coOrganizerCount > 0 && <span className="text-muted-foreground"> +{s.coOrganizerCount}</span>}
              </TableCell>
              <TableCell className="hidden font-mono text-xs lg:table-cell">{s.slug}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{s.status.toLowerCase()}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">{s.editionCount}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/event-series/${s.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteEventSeriesButton id={s.id} label={s.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
