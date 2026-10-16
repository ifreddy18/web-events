"use client"

import { PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { listEditionCompetitions } from "../queries"
import { CompetitionForm, type DisciplineOption, type EditionOption } from "./competition-form"
import { DeleteCompetitionButton } from "./delete-competition-button"

type EditionCompetition = Awaited<ReturnType<typeof listEditionCompetitions>>[number]
/** `null` = closed, `"new"` = creating, otherwise the competition being edited. */
type DialogTarget = null | "new" | EditionCompetition

const humanize = (value: string) => value.toLowerCase().replace(/_/g, " ")

/**
 * Competitions section of the edition screen. It only hosts the existing `CompetitionForm` in a dialog with
 * the edition fixed; validation, rules and Server Actions are the standalone feature's, unchanged.
 * Saving refreshes the page data instead of navigating, so the admin stays in the edition workflow.
 */
export function EditionCompetitions({
  edition,
  competitions,
  disciplines,
  locations,
}: {
  edition: EditionOption
  competitions: EditionCompetition[]
  disciplines: DisciplineOption[]
  locations: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [target, setTarget] = useState<DialogTarget>(null)

  function close() {
    setTarget(null)
  }
  function saved() {
    close()
    router.refresh()
  }

  return (
    <section aria-labelledby="edition-competitions-heading" className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="edition-competitions-heading" className="text-lg font-semibold">
          Competitions
        </h2>
        <Button type="button" size="sm" onClick={() => setTarget("new")}>
          <PlusIcon aria-hidden /> Add competition
        </Button>
      </div>

      {competitions.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No competitions in this edition yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {competitions.map((competition) => (
            <li key={competition.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{competition.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[competition.disciplineName, competition.distanceKm !== null ? `${competition.distanceKm} km` : null, competition.startsOn]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={competition.participationType === "COMPETITIVE" ? "default" : "secondary"}>{humanize(competition.participationType)}</Badge>
                  <Badge variant={competition.status === "ACTIVE" ? "outline" : "secondary"}>{humanize(competition.status)}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" aria-label={`Edit ${competition.name}`} onClick={() => setTarget(competition)}>
                  Edit
                </Button>
                <DeleteCompetitionButton id={competition.id} label={competition.name} onDeleted={() => router.refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={target !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{target === "new" ? "Add competition" : "Edit competition"}</DialogTitle>
            <DialogDescription>
              {target === "new" ? "It is added to this edition." : "Changes apply to this edition's competition."} The same rules as the
              Competitions section apply.
            </DialogDescription>
          </DialogHeader>
          {target !== null && (
            <CompetitionForm
              // A new key per target resets the form state between competitions.
              key={target === "new" ? "new" : target.id}
              id={target === "new" ? undefined : target.id}
              editions={[edition]}
              disciplines={disciplines}
              locations={locations}
              initial={target === "new" ? { eventEditionId: edition.id } : target.form}
              initialDisciplineId={target === "new" ? undefined : target.disciplineId}
              initialMetadata={target === "new" ? undefined : target.metadata}
              onSaved={saved}
              onCancel={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
