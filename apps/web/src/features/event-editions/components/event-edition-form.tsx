"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { createEventEdition, updateEventEdition } from "../actions"

type Values = {
  eventSeriesId: string
  name: string
  slug: string
  label: string
  year: string
  startsOn: string
  endsOn: string
  startTime: string
  endTime: string
  timeZone: string
  rescheduledFromOn: string
  registrationOpenAt: string
  registrationCloseAt: string
  registrationStatus: string
  registrationUrl: string
  resultsUrl: string
  publicationStatus: string
  status: string
  locationId: string
  primaryOrganizerId: string
  coOrganizerIds: string[]
}

type Option = { id: string; label: string }
/** Organizers a series usually runs; copied into the form when a series is selected. */
export type SeriesOption = Option & { primaryOrganizerId: string; coOrganizerIds: string[] }

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

/**
 * Create and edit form. On create, picking a series pre-fills the organizer assignments from the
 * series template; from then on the edition's assignments are its own (editing never touches the series).
 * On edit, the series is fixed and shown read-only.
 */
export function EventEditionForm({
  id,
  seriesName,
  initial,
  series,
  locations,
  organizers,
}: {
  id?: string
  seriesName?: string
  initial?: Partial<Values>
  series: SeriesOption[]
  locations: Option[]
  organizers: Option[]
}) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [seriesId, setSeriesId] = useState(initial?.eventSeriesId ?? "")
  const [primary, setPrimary] = useState(initial?.primaryOrganizerId ?? "")
  const [coIds, setCoIds] = useState<string[]>(initial?.coOrganizerIds ?? [])

  function applySeriesTemplate(selectedSeriesId: string) {
    const template = series.find((s) => s.id === selectedSeriesId)
    setPrimary(template?.primaryOrganizerId ?? "")
    setCoIds(template?.coOrganizerIds ?? [])
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPending(true)
    const values = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      ...(id ? {} : { eventSeriesId: seriesId }),
      primaryOrganizerId: primary,
      coOrganizerIds: coIds.filter((c) => c !== primary),
    }
    let result: ActionResult<{ id: string }>
    try {
      result = id ? await updateEventEdition(id, values) : await createEventEdition(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/event-editions?notice=${id ? "updated" : "created"}`)
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

  const field = (name: keyof Omit<Values, "coOrganizerIds">, label: string, opts: { required?: boolean; hint?: string; type?: string; inputMode?: "numeric" } = {}) => (
    <div key={name} className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      <Input id={name} name={name} type={opts.type} inputMode={opts.inputMode} defaultValue={initial?.[name] ?? ""} {...a11y(name)} />
      {opts.hint && !errors[name] && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
      {error(name)}
    </div>
  )

  const choice = (name: keyof Values, label: string, options: Option[], opts: { empty?: string } = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select id={name} name={name} defaultValue={(initial?.[name] as string | undefined) ?? options[0]?.id ?? ""} className={selectClass} {...a11y(name)}>
        {opts.empty !== undefined && <option value="">{opts.empty}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error(name)}
    </div>
  )

  const coCandidates = organizers.filter((o) => o.id !== primary)

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-4">
      {id ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Series</span>
          <p className="text-sm">{seriesName}</p>
          <p className="text-xs text-muted-foreground">The series of an edition cannot be changed.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="eventSeriesId" className="text-sm font-medium">
            Series <span aria-hidden>*</span>
          </label>
          <select
            id="eventSeriesId"
            value={seriesId}
            onChange={(e) => {
              setSeriesId(e.target.value)
              applySeriesTemplate(e.target.value)
            }}
            className={selectClass}
            {...a11y("eventSeriesId")}
          >
            <option value="">Select…</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {series.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No series yet. <Link href="/admin/event-series/new" className="underline">Create one</Link> first.
            </p>
          )}
          {error("eventSeriesId")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Edition name", { required: true })}
        {field("slug", "Slug", {
          hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from name, label and year.",
        })}
        {field("year", "Year", { required: true, inputMode: "numeric", hint: "Identifies the edition; it can differ from the start date's year." })}
        {field("label", "Label", { hint: "Tells editions of the same year apart, e.g. “Spring” or “II”." })}
      </div>

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Status</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {choice("publicationStatus", "Publication", [
            { id: "DRAFT", label: "Draft" },
            { id: "PUBLISHED", label: "Published" },
          ])}
          {choice("status", "Event status", [
            { id: "SCHEDULED", label: "Scheduled" },
            { id: "POSTPONED", label: "Postponed" },
            { id: "COMPLETED", label: "Completed" },
            { id: "CANCELLED", label: "Cancelled" },
          ])}
          {choice("registrationStatus", "Registration", [
            { id: "UNKNOWN", label: "Unknown" },
            { id: "NOT_OPEN", label: "Not open" },
            { id: "OPEN", label: "Open" },
            { id: "CLOSED", label: "Closed" },
            { id: "SOLD_OUT", label: "Sold out" },
          ])}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Dates</legend>
        <p className="text-xs text-muted-foreground">
          Leave the dates empty while they are to be announced. The end date is inclusive; set it for multi-day or overnight events.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("startsOn", "Start date", { type: "date" })}
          {field("endsOn", "End date", { type: "date" })}
          {field("startTime", "Start time", { type: "time" })}
          {field("endTime", "End time", { type: "time" })}
          {field("timeZone", "Time zone", { hint: "IANA name. Defaults to America/Caracas." })}
          {field("rescheduledFromOn", "Originally scheduled for", { type: "date", hint: "Set when the event was moved to a new date." })}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Registration and results</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("registrationOpenAt", "Registration opens", { type: "datetime-local", hint: "In the edition's time zone." })}
          {field("registrationCloseAt", "Registration closes", { type: "datetime-local", hint: "In the edition's time zone." })}
          {field("registrationUrl", "Registration URL", { hint: "https://…" })}
          {field("resultsUrl", "Results URL", { hint: "https://…" })}
        </div>
      </fieldset>

      {choice("locationId", "Location", locations, { empty: "To be announced" })}

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Organizers</legend>
        <p className="text-xs text-muted-foreground">
          {id
            ? "These belong to this edition only; changing them does not affect the series."
            : "Copied from the selected series. Adjust them if this edition differs; the series is not modified."}
        </p>
        {!id && seriesId && (
          <Button type="button" variant="outline" size="sm" onClick={() => applySeriesTemplate(seriesId)}>
            Reset to series organizers
          </Button>
        )}
        <div className="space-y-1.5">
          <label htmlFor="primaryOrganizerId" className="text-sm font-medium">
            Primary organizer <span aria-hidden>*</span>
          </label>
          <select
            id="primaryOrganizerId"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className={selectClass}
            {...a11y("primaryOrganizerId")}
          >
            <option value="">Select…</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {organizers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No organizers yet. <Link href="/admin/organizers/new" className="underline">Create one</Link> first.
            </p>
          )}
          {error("primaryOrganizerId")}
        </div>
        <div className="space-y-1.5">
          <span id="co-label" className="text-sm font-medium">
            Co-organizers
          </span>
          <ul aria-labelledby="co-label" className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
            {coCandidates.map((o) => (
              <li key={o.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={coIds.includes(o.id)}
                    onChange={(e) => setCoIds((prev) => (e.target.checked ? [...prev, o.id] : prev.filter((c) => c !== o.id)))}
                  />
                  {o.label}
                </label>
              </li>
            ))}
          </ul>
          {error("coOrganizerIds")}
        </div>
      </fieldset>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create edition"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/event-editions">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
