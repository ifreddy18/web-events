import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatLocationLabel } from "../rules"
import type { listLocations } from "../queries"
import { DeleteLocationButton } from "./delete-location-button"

type Result = Awaited<ReturnType<typeof listLocations>>

export function LocationsTable({ items }: { items: Result["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Venue</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="hidden md:table-cell">State</TableHead>
            <TableHead className="hidden sm:table-cell">Country</TableHead>
            <TableHead className="hidden lg:table-cell">Slug</TableHead>
            <TableHead className="hidden md:table-cell">In use</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.venueName ?? "—"}</TableCell>
              <TableCell>{l.city ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell">{l.state ?? "—"}</TableCell>
              <TableCell className="hidden sm:table-cell">{l.country}</TableCell>
              <TableCell className="hidden font-mono text-xs lg:table-cell">{l.slug}</TableCell>
              <TableCell className="hidden md:table-cell">
                {l.editionCount + l.competitionCount > 0 ? (
                  <Badge variant="secondary">
                    {l.editionCount} ed. · {l.competitionCount} comp.
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/locations/${l.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteLocationButton id={l.id} label={formatLocationLabel(l)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
