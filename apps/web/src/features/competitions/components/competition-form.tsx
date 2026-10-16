"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type FormEvent } from "react"
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
 * Embedded in the edition screen (`onSaved` set), the edition is fixed from the start and the form reports
 * back to its host instead of navigating away.
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
  onSaved,
  onCancel,
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
  /** Set when the form lives in a dialog on the edition screen; called after a successful save. */
  onSaved?: () => void
  /** Replaces the "Cancel" link to the standalone list; required when `onSaved` is set. */
  onCancel?: () => void
}) {
  const router = useRouter()
  // Prefixes element ids: this form can sit on the same page as the edition form, which shares field names.
  const formId = useId()
  const fieldId = (name: string) => `${formId}-${name}`
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
      if (onSaved) {
        onSaved()
        return
      }
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
      <p id={fieldId(`${name}-error`)} className="text-sm text-destructive">
        {errors[name].join(" ")}
      </p>
    )
  // Helper text stays visible next to the input and is announced with it; an error is announced after it.
  const a11y = (name: string, hasHint = false) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": [hasHint && fieldId(`${name}-hint`), errors[name] && fieldId(`${name}-error`)].filter(Boolean).join(" ") || undefined,
  })
  const hint = (name: string, text?: string) =>
    text && (
      <p id={fieldId(`${name}-hint`)} className="text-xs text-muted-foreground">
        {text}
      </p>
    )

  const field = (name: keyof Values, label: string, opts: { required?: boolean; hint?: string; type?: string } = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(name)} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      <Input id={fieldId(name)} name={name} type={opts.type} defaultValue={initial?.[name] ?? ""} {...a11y(name, !!opts.hint)} />
      {hint(name, opts.hint)}
      {error(name)}
    </div>
  )

  const choice = (name: "status" | "participationType", label: string, options: Option[], helpText?: string) => (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(name)} className="text-sm font-medium">
        {label}
      </label>
      <select id={fieldId(name)} name={name} defaultValue={initial?.[name] ?? options[0].id} className={selectClass} {...a11y(name, !!helpText)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {hint(name, helpText)}
      {error(name)}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
      {id || onSaved ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Edition</span>
          <p className="text-sm">{edition?.label}</p>
          {id && (
            <p className="text-xs text-muted-foreground">The edition of a competition cannot be changed. Create a new competition in the other edition instead.</p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor={fieldId("eventEditionId")} className="text-sm font-medium">
            Edition <span aria-hidden>*</span>
          </label>
          <select id={fieldId("eventEditionId")} value={editionId} onChange={(e) => setEditionId(e.target.value)} className={selectClass} {...a11y("eventEditionId")}>
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
        <label htmlFor={fieldId("disciplineId")} className="text-sm font-medium">
          Discipline <span aria-hidden>*</span>
        </label>
        <select id={fieldId("disciplineId")} value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={selectClass} {...a11y("disciplineId")}>
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
        ], "Competitive, or recreational such as a fun run. Neither type requires results.")}
        {choice("status", "Status", [
          { id: "ACTIVE", label: "Active" },
          { id: "COMPLETED", label: "Completed" },
          { id: "CANCELLED", label: "Cancelled" },
        ], "Whether this competition is still planned, already held, or called off. The edition has its own status.")}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={fieldId("description")} className="text-sm font-medium">
          Description
        </label>
        <Textarea id={fieldId("description")} name="description" rows={3} defaultValue={initial?.description ?? ""} {...a11y("description")} />
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
          {field("startTime", "Start time", { type: "time", hint: "Never inherited from the edition." })}
          {field("endTime", "End time", { type: "time" })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={fieldId("locationId")} className="text-sm font-medium">
          Location
        </label>
        <select id={fieldId("locationId")} name="locationId" defaultValue={initial?.locationId ?? ""} className={selectClass} {...a11y("locationId", true)}>
          <option value="">{`Same as the edition${edition?.locationLabel ? ` (${edition.locationLabel})` : ""}`}</option>
          {locations.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {hint("locationId", "Choose a place only if this competition is held somewhere other than the edition.")}
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
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/admin/competitions">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
