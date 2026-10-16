"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EditionPhotographer } from "../queries"
import { ACCREDITATION_DETAILS } from "../rules"
import { EventPhotographerDialog, type PhotographerDialogTarget } from "./event-photographer-dialog"
import { RemoveEventPhotographerButton } from "./remove-event-photographer-button"

/**
 * Photographers section of the edition screen. Rendered outside the edition `<form>` (dialog submit events bubble
 * through portals). Saving refreshes the page data so the admin stays in the edition workflow.
 */
export function EditionPhotographers({ eventEditionId, photographers }: { eventEditionId: string; photographers: EditionPhotographer[] }) {
  const router = useRouter()
  const [target, setTarget] = useState<PhotographerDialogTarget | null>(null)

  return (
    <section aria-labelledby="edition-photographers-heading" className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="edition-photographers-heading" className="text-lg font-semibold">
          Photographers
        </h2>
        <Button type="button" size="sm" onClick={() => setTarget("new")}>
          <PlusIcon aria-hidden /> Add photographer
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Photographers who covered this edition. Removing one here only ends the link to this edition; the profile stays in Photographers and in
        other editions.
      </p>

      {photographers.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No photographers in this edition yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {photographers.map((assignment) => (
            <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{assignment.photographer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    assignment.photographer.instagram ? `@${assignment.photographer.instagram}` : "No Instagram",
                    [assignment.photographer.city, assignment.photographer.countryCode].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Badge variant={assignment.accreditation === "OFFICIAL" ? "default" : "secondary"}>
                  {ACCREDITATION_DETAILS[assignment.accreditation].label}
                </Badge>
                {assignment.description && <p className="break-words text-sm">{assignment.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" aria-label={`Edit ${assignment.photographer.name}`} onClick={() => setTarget(assignment)}>
                  Edit
                </Button>
                <RemoveEventPhotographerButton id={assignment.id} label={assignment.photographer.name} onRemoved={() => router.refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <EventPhotographerDialog
        eventEditionId={eventEditionId}
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => {
          setTarget(null)
          router.refresh()
        }}
      />
    </section>
  )
}
