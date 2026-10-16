"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { createEventSeries, updateEventSeries } from "../actions"

type Values = {
  name: string
  slug: string
  disciplineId: string
  description: string
  officialWebsite: string
  instagram: string
  status: string
  primaryOrganizerId: string
  coOrganizerIds: string[]
}

type Option = { id: string; label: string }

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

export function EventSeriesForm({
  id,
  initial,
  disciplines,
  organizers,
}: {
  id?: string
  initial?: Partial<Values>
  disciplines: Option[]
  organizers: Option[]
}) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [primary, setPrimary] = useState(initial?.primaryOrganizerId ?? "")
  const [coIds, setCoIds] = useState<string[]>(initial?.coOrganizerIds ?? [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPending(true)
    const values = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      primaryOrganizerId: primary,
      coOrganizerIds: coIds.filter((c) => c !== primary),
    }
    let result: ActionResult<{ id: string }>
    try {
      result = id ? await updateEventSeries(id, values) : await createEventSeries(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/event-series?notice=${id ? "updated" : "created"}`)
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
  const a11y = (name: string, hasHint = false) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": [hasHint && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(" ") || undefined,
  })

  const text = (name: keyof Values, label: string, opts: { required?: boolean; hint?: string; multiline?: boolean } = {}) => (
    <div key={name} className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      {opts.multiline ? (
        <Textarea id={name} name={name} rows={4} defaultValue={(initial?.[name] as string) ?? ""} {...a11y(name, !!opts.hint)} />
      ) : (
        <Input id={name} name={name} defaultValue={(initial?.[name] as string) ?? ""} {...a11y(name, !!opts.hint)} />
      )}
      {opts.hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {opts.hint}
        </p>
      )}
      {error(name)}
    </div>
  )

  const coCandidates = organizers.filter((o) => o.id !== primary)

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      {text("name", "Name", { required: true, hint: "The event as a whole, without a year, e.g. “Gulima Trail Running”. Each yearly occurrence is an edition." })}
      {text("slug", "Slug", {
        hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from the name.",
      })}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="disciplineId" className="text-sm font-medium">
            Discipline <span aria-hidden>*</span>
          </label>
          <select id="disciplineId" name="disciplineId" defaultValue={initial?.disciplineId ?? ""} className={selectClass} {...a11y("disciplineId")}>
            <option value="">Select…</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          {disciplines.length === 0 && (
            <p className="text-xs text-muted-foreground">No disciplines exist yet. Load the sports/disciplines catalog (seed) first.</p>
          )}
          {error("disciplineId")}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={initial?.status ?? "ACTIVE"} className={selectClass} aria-describedby="status-hint">
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <p id="status-hint" className="text-xs text-muted-foreground">
            Archived and cancelled series stay selectable for new editions but are marked in the list.
          </p>
        </div>
      </div>

      {text("description", "Description", { multiline: true })}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("officialWebsite", "Official website", { hint: "https://…" })}
        {text("instagram", "Instagram", { hint: "Handle or profile URL" })}
      </div>

      <fieldset className="space-y-4 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Usual organizers</legend>
        <p className="text-xs text-muted-foreground">
          Template for future editions: exactly one primary organizer, co-organizers optional. Editions keep their own organizers once created.
        </p>
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
          {pending ? "Saving…" : id ? "Save changes" : "Create series"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/event-series">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
