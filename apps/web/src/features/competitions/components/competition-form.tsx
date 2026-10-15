"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { createCompetition, updateCompetition } from "../actions"
import { trailRunningFormToMetadata, trailRunningMetadataToForm, type TrailRunningFormValues } from "../metadata"
import { TrailRunningMetadataFields } from "./trail-running-metadata-fields"

type Values = {
  name: string
  slug: string
  description: string
  status: string
  participationType: string
  startsOn: string
  endsOn: string
  startTime: string
  endTime: string
  locationId: string
  registrationUrl: string
}

type Option = { id: string; label: string }
/** What an edition contributes to its competitions; shown so the admin knows what an empty field inherits. */
export type EditionOption = Option & { startsOn: string | null; endsOn: string | null; locationLabel: string | null }
export type DisciplineOption = Option & { slug: string }

/** Discipline whose metadata fields exist in this form. Add a discipline here when it gets a schema in `metadata.ts`. */
const TRAIL_RUNNING = "trail-running"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

function describeEditionDates(edition: EditionOption | undefined) {
  if (!edition) return "Select an edition to see its dates."
  if (!edition.startsOn) return "The edition dates are still to be announced."
  const end = edition.endsOn && edition.endsOn !== edition.startsOn ? ` → ${edition.endsOn}` : ""
  return `Edition dates: ${edition.startsOn}${end}. Leave empty to inherit them.`
}

/**
 * Create and edit form. The parent edition is chosen on create and fixed afterwards (shown read-only).
 * Empty dates and location are inherited from the edition; times are never inherited.
 * Metadata fields appear only for disciplines that have a schema; the server decides what is valid.
 */
export function CompetitionForm({
  id,
  initial,
  initialDisciplineId,
  initialMetadata,
  editions,
  disciplines,
  locations,
}: {
  id?: string
  initial?: Partial<Values> & { eventEditionId?: string }
  initialDisciplineId?: string
  /** Stored metadata of the competition being edited (`null` or an object). */
  initialMetadata?: unknown
  /** On edit, only the competition's own edition (read-only). */
  editions: EditionOption[]
  disciplines: DisciplineOption[]
  locations: Option[]
}) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [editionId, setEditionId] = useState(initial?.eventEditionId ?? "")
  const [disciplineId, setDisciplineId] = useState(initialDisciplineId ?? "")
  const [discardStoredMetadata, setDiscardStoredMetadata] = useState(false)

  const initialDiscipline = disciplines.find((d) => d.id === initialDisciplineId)
  const discipline = disciplines.find((d) => d.id === disciplineId)
  const [trailValues, setTrailValues] = useState<TrailRunningFormValues>(() =>
    trailRunningMetadataToForm(initialDiscipline?.slug === TRAIL_RUNNING ? initialMetadata : null),
  )

  const edition = editions.find((e) => e.id === editionId)
  const hasStoredMetadata = !!initialMetadata && Object.keys(initialMetadata as object).length > 0
  const disciplineChanged = !!id && disciplineId !== initialDisciplineId
  // Moving to another discipline would orphan the stored metadata; the server requires this confirmation.
  const needsDiscardConfirmation = disciplineChanged && hasStoredMetadata

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPending(true)
    const values = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      disciplineId,
      // `undefined` tells the server to keep stored metadata for disciplines without a form.
      metadata: discipline?.slug === TRAIL_RUNNING ? trailRunningFormToMetadata(trailValues) : undefined,
      ...(id ? { discardStoredMetadata: needsDiscardConfirmation && discardStoredMetadata } : { eventEditionId: editionId }),
    }
    let result: ActionResult<{ id: string }>
    try {
      result = id ? await updateCompetition(id, values) : await createCompetition(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/competitions?notice=${id ? "updated" : "created"}`)
      router.refresh()
      return
    }
    setPending(false)
    setErrors(result.error.fieldErrors ?? {})
    setFormError(result.error.code === "validation" ? null : result.error.message)
  }

  const error = (name: string) =>
    errors[name] && (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {errors[name].join(" ")}
      </p>
    )
  const a11y = (name: string) => ({ "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-error` : undefined })

  const field = (name: keyof Values, label: string, opts: { required?: boolean; hint?: string; type?: string } = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      <Input id={name} name={name} type={opts.type} defaultValue={initial?.[name] ?? ""} {...a11y(name)} />
      {opts.hint && !errors[name] && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
      {error(name)}
    </div>
  )

  const choice = (name: "status" | "participationType", label: string, options: Option[]) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select id={name} name={name} defaultValue={initial?.[name] ?? options[0].id} className={selectClass} {...a11y(name)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error(name)}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
      {id ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Edition</span>
          <p className="text-sm">{edition?.label}</p>
          <p className="text-xs text-muted-foreground">The edition of a competition cannot be changed. Create a new competition in the other edition instead.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="eventEditionId" className="text-sm font-medium">
            Edition <span aria-hidden>*</span>
          </label>
          <select id="eventEditionId" value={editionId} onChange={(e) => setEditionId(e.target.value)} className={selectClass} {...a11y("eventEditionId")}>
            <option value="">Select…</option>
            {editions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {editions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No editions yet. <Link href="/admin/event-editions/new" className="underline">Create one</Link> first.
            </p>
          )}
          {error("eventEditionId")}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="disciplineId" className="text-sm font-medium">
          Discipline <span aria-hidden>*</span>
        </label>
        <select id="disciplineId" value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={selectClass} {...a11y("disciplineId")}>
          <option value="">Select…</option>
          {disciplines.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {disciplines.length === 0 && (
          <p className="text-xs text-muted-foreground">No disciplines yet. Load the catalog seed first (<code>pnpm db:seed</code>).</p>
        )}
        <p className="text-xs text-muted-foreground">It may differ from the discipline of the event series.</p>
        {error("disciplineId")}
      </div>

      {needsDiscardConfirmation && (
        <div className="space-y-1.5 rounded-md border border-dashed p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={discardStoredMetadata} onChange={(e) => setDiscardStoredMetadata(e.target.checked)} />
            Discard the existing discipline details
          </label>
          <p className="text-xs text-muted-foreground">The saved details belong to the previous discipline. Confirm to remove them when changing it.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Name", { required: true, hint: "e.g. 21K or Recreational 5K." })}
        {field("slug", "Slug", {
          hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from the name. Unique within the edition.",
        })}
        {choice("participationType", "Participation", [
          { id: "COMPETITIVE", label: "Competitive" },
          { id: "RECREATIONAL", label: "Recreational" },
        ])}
        {choice("status", "Status", [
          { id: "ACTIVE", label: "Active" },
          { id: "COMPLETED", label: "Completed" },
          { id: "CANCELLED", label: "Cancelled" },
        ])}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Textarea id="description" name="description" rows={3} defaultValue={initial?.description ?? ""} {...a11y("description")} />
        {error("description")}
      </div>

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Schedule</legend>
        <p className="text-xs text-muted-foreground">
          {describeEditionDates(edition)} Set an end date for multi-day competitions. Times are never inherited from the edition.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("startsOn", "Start date", { type: "date" })}
          {field("endsOn", "End date", { type: "date" })}
          {field("startTime", "Start time", { type: "time" })}
          {field("endTime", "End time", { type: "time" })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="locationId" className="text-sm font-medium">
          Location
        </label>
        <select id="locationId" name="locationId" defaultValue={initial?.locationId ?? ""} className={selectClass} {...a11y("locationId")}>
          <option value="">{`Same as the edition${edition?.locationLabel ? ` (${edition.locationLabel})` : ""}`}</option>
          {locations.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {error("locationId")}
      </div>

      {field("registrationUrl", "Registration URL", { hint: "Only when this competition registers separately from its edition. https://…" })}

      {discipline?.slug === TRAIL_RUNNING && <TrailRunningMetadataFields values={trailValues} onChange={setTrailValues} errors={errors} />}
      {error("metadata")}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create competition"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/competitions">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
