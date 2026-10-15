import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { listEventEditions } from "../queries"
import { DeleteEventEditionButton } from "./delete-event-edition-button"

type Items = Awaited<ReturnType<typeof listEventEditions>>["items"]

const humanize = (value: string) => value.toLowerCase().replace(/_/g, " ")

function formatDates(startsOn: string | null, endsOn: string | null) {
  if (!startsOn) return "To be announced"
  return endsOn && endsOn !== startsOn ? `${startsOn} → ${endsOn}` : startsOn
}

export function EventEditionsTable({ items }: { items: Items }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Edition</TableHead>
            <TableHead className="hidden md:table-cell">Series</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead className="hidden lg:table-cell">Primary organizer</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((edition) => (
            <TableRow key={edition.id}>
              <TableCell className="font-medium">
                {edition.name}
                <div className="text-xs font-normal text-muted-foreground">
                  {edition.year}
                  {edition.label ? ` · ${edition.label}` : ""}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{edition.seriesName}</TableCell>
              <TableCell className="whitespace-nowrap">{formatDates(edition.startsOn, edition.endsOn)}</TableCell>
              <TableCell className="hidden lg:table-cell">{edition.locationLabel ?? "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {edition.primaryOrganizer ?? "—"}
                {edition.coOrganizerCount > 0 && <span className="text-muted-foreground"> +{edition.coOrganizerCount}</span>}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  <Badge variant={edition.publicationStatus === "PUBLISHED" ? "default" : "secondary"}>{humanize(edition.publicationStatus)}</Badge>
                  {edition.status !== "SCHEDULED" && <Badge variant="outline">{humanize(edition.status)}</Badge>}
                  {edition.registrationStatus !== "UNKNOWN" && <Badge variant="outline">registration {humanize(edition.registrationStatus)}</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/event-editions/${edition.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteEventEditionButton id={edition.id} label={edition.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
