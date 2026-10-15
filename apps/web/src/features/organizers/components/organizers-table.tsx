import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { listOrganizers } from "../queries"
import { DeleteOrganizerButton } from "./delete-organizer-button"

type Result = Awaited<ReturnType<typeof listOrganizers>>

export function OrganizersTable({ items }: { items: Result["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Instagram</TableHead>
            <TableHead className="hidden md:table-cell">Website</TableHead>
            <TableHead className="hidden lg:table-cell">Slug</TableHead>
            <TableHead className="hidden md:table-cell">Assigned</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.name}</TableCell>
              <TableCell className="hidden sm:table-cell">{o.instagram ? `@${o.instagram}` : "—"}</TableCell>
              <TableCell className="hidden max-w-48 truncate md:table-cell">{o.website ?? "—"}</TableCell>
              <TableCell className="hidden font-mono text-xs lg:table-cell">{o.slug}</TableCell>
              <TableCell className="hidden md:table-cell">
                {o.seriesCount + o.editionCount > 0 ? (
                  <Badge variant="secondary">
                    {o.seriesCount} series · {o.editionCount} ed.
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/organizers/${o.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteOrganizerButton id={o.id} label={o.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
