import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { listCompetitions } from "../queries"
import { DeleteCompetitionButton } from "./delete-competition-button"

type Items = Awaited<ReturnType<typeof listCompetitions>>["items"]

const humanize = (value: string) => value.toLowerCase().replace(/_/g, " ")

function formatSchedule(competition: Items[number]) {
  const { effectiveStartsOn: start, effectiveEndsOn: end, startTime, endTime } = competition
  if (!start) return "To be announced"
  const dates = end && end !== start ? `${start} → ${end}` : start
  const times = startTime ? ` ${startTime}${endTime ? `–${endTime}` : ""}` : ""
  return dates + times
}

export function CompetitionsTable({ items }: { items: Items }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competition</TableHead>
            <TableHead className="hidden md:table-cell">Edition</TableHead>
            <TableHead className="hidden sm:table-cell">Discipline</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((competition) => (
            <TableRow key={competition.id}>
              <TableCell className="font-medium">
                {competition.name}
                <div className="text-xs font-normal text-muted-foreground">{competition.slug}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {competition.editionName}
                <div className="text-xs text-muted-foreground">
                  {competition.seriesName} · {competition.editionYear}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{competition.disciplineName}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatSchedule(competition)}
                {competition.effectiveStartsOn && competition.datesInherited && <div className="text-xs text-muted-foreground">from edition</div>}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {competition.locationLabel ?? "—"}
                {competition.locationLabel && competition.locationInherited && <div className="text-xs text-muted-foreground">from edition</div>}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap gap-1">
                  <Badge variant={competition.participationType === "COMPETITIVE" ? "default" : "secondary"}>{humanize(competition.participationType)}</Badge>
                  {competition.status !== "ACTIVE" && <Badge variant="outline">{humanize(competition.status)}</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/competitions/${competition.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteCompetitionButton id={competition.id} label={competition.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
