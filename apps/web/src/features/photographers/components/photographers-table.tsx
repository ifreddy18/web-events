import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { listPhotographers } from "../queries"
import { DeletePhotographerButton } from "./delete-photographer-button"

type Result = Awaited<ReturnType<typeof listPhotographers>>

export function PhotographersTable({ items }: { items: Result["items"] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Instagram</TableHead>
            <TableHead className="hidden md:table-cell">Website</TableHead>
            <TableHead className="hidden lg:table-cell">Disciplines</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((photographer) => (
            <TableRow key={photographer.id}>
              <TableCell className="font-medium">{photographer.name}</TableCell>
              <TableCell className="hidden sm:table-cell">{photographer.instagram ? `@${photographer.instagram}` : "—"}</TableCell>
              <TableCell className="hidden max-w-48 truncate md:table-cell">{photographer.website ?? "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {photographer.disciplineNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {photographer.disciplineNames.map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {[photographer.city, photographer.countryCode].filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/photographers/${photographer.id}/edit`}>Edit</Link>
                  </Button>
                  <DeletePhotographerButton id={photographer.id} label={photographer.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
