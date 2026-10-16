"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/searchable-select"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { buildCountryGroups } from "@/shared/countries"
import { createLocation, updateLocation } from "../actions"

type Values = {
  country: string
  state: string
  city: string
  venueName: string
  address: string
  slug: string
  latitude: string
  longitude: string
}

const FIELDS: { name: keyof Values; label: string; hint?: string; required?: boolean; inputMode?: "decimal" }[] = [
  { name: "state", label: "State / region" },
  { name: "city", label: "City" },
  { name: "venueName", label: "Venue name", hint: "The place people know it by, e.g. “Parque del Este”." },
  { name: "address", label: "Address", hint: "Street address or directions to the venue." },
  { name: "latitude", label: "Latitude", hint: "-90 to 90", inputMode: "decimal" },
  { name: "longitude", label: "Longitude", hint: "-180 to 180", inputMode: "decimal" },
]

export function LocationForm({ id, initial }: { id?: string; initial?: Partial<Values> }) {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPending(true)
    const values = Object.fromEntries(new FormData(event.currentTarget))
    let result: ActionResult<{ id: string }>
    try {
      result = id ? await updateLocation(id, values) : await createLocation(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/locations?notice=${id ? "updated" : "created"}`)
      router.refresh()
      return
    }
    setPending(false)
    setErrors(result.error.fieldErrors ?? {})
    setFormError(result.error.code === "validation" ? null : result.error.message)
  }

  const countryGroups = buildCountryGroups(initial?.country)

  const field = (name: keyof Values, label: string, opts: { required?: boolean; hint?: string; inputMode?: "decimal" } = {}) => (
    <div key={name} className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {opts.required && <span aria-hidden> *</span>}
      </label>
      <Input
        id={name}
        name={name}
        defaultValue={initial?.[name] ?? ""}
        required={opts.required}
        inputMode={opts.inputMode}
        aria-invalid={!!errors[name]}
        aria-describedby={[opts.hint && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(" ") || undefined}
      />
      {opts.hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {opts.hint}
        </p>
      )}
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errors[name].join(" ")}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="country" className="text-sm font-medium">
            Country <span aria-hidden>*</span>
          </label>
          <SearchableSelect
            id="country"
            name="country"
            groups={countryGroups}
            defaultValue={initial?.country ?? ""}
            placeholder="Select a country…"
            searchPlaceholder="Search countries…"
            emptyMessage="No country found."
            invalid={!!errors.country}
            describedBy={errors.country ? "country-error" : undefined}
          />
          {errors.country && (
            <p id="country-error" className="text-sm text-destructive">
              {errors.country.join(" ")}
            </p>
          )}
        </div>
        {FIELDS.map((f) => field(f.name, f.label, f))}
      </div>
      {field("slug", "Slug", {
        hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from the place details.",
      })}
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create location"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/locations">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
