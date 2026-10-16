"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type FormEvent } from "react"
import { SearchableSelect } from "@/components/searchable-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { buildCountryCodeGroups } from "@/shared/countries"
import { createPhotographer, updatePhotographer } from "../actions"

type Values = {
  name: string
  slug: string
  description: string
  instagram: string
  website: string
  email: string
  phone: string
  profileImageUrl: string
  city: string
  countryCode: string
}

export type DisciplineOption = { id: string; label: string; sportName: string }

type FieldOptions = { required?: boolean; hint?: string; type?: string; inputMode?: "email" | "tel" | "url"; autoComplete?: string }

const countryGroups = buildCountryCodeGroups()

/**
 * Create and edit form for a photographer profile. Every contact channel is optional (an Instagram-only
 * profile is valid). Disciplines are chosen with checkboxes grouped by sport and sent as an id list.
 */
export function PhotographerForm({
  id,
  initial,
  initialDisciplineIds = [],
  disciplines,
}: {
  id?: string
  initial?: Partial<Values>
  initialDisciplineIds?: string[]
  disciplines: DisciplineOption[]
}) {
  const router = useRouter()
  const formId = useId()
  const fieldId = (name: string) => `${formId}-${name}`
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [disciplineIds, setDisciplineIds] = useState(new Set(initialDisciplineIds))

  const sportGroups = Map.groupBy(disciplines, (discipline) => discipline.sportName)

  function toggleDiscipline(disciplineId: string, selected: boolean) {
    setDisciplineIds((current) => {
      const next = new Set(current)
      if (selected) next.add(disciplineId)
      else next.delete(disciplineId)
      return next
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setPending(true)
    const values = { ...Object.fromEntries(new FormData(event.currentTarget)), disciplineIds: [...disciplineIds] }
    let result: ActionResult<{ id: string }>
    try {
      result = id ? await updatePhotographer(id, values) : await createPhotographer(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/photographers?notice=${id ? "updated" : "created"}`)
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
  const describedBy = (name: string, hasHint: boolean) =>
    [hasHint && fieldId(`${name}-hint`), errors[name] && fieldId(`${name}-error`)].filter(Boolean).join(" ") || undefined
  const hint = (name: string, text?: string) =>
    text && (
      <p id={fieldId(`${name}-hint`)} className="text-xs text-muted-foreground">
        {text}
      </p>
    )

  const field = (name: keyof Values, label: string, options: FieldOptions = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={fieldId(name)} className="text-sm font-medium">
        {label}
        {options.required && <span aria-hidden> *</span>}
      </label>
      <Input
        id={fieldId(name)}
        name={name}
        type={options.type}
        inputMode={options.inputMode}
        autoComplete={options.autoComplete}
        defaultValue={initial?.[name] ?? ""}
        aria-invalid={!!errors[name]}
        aria-describedby={describedBy(name, !!options.hint)}
      />
      {hint(name, options.hint)}
      {error(name)}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Public name", {
            required: true,
            hint: "A person, studio or team. Different photographers may share a name.",
          })}
          {field("slug", "Slug", {
            hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from the name.",
          })}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={fieldId("description")} className="text-sm font-medium">
            Biography
          </label>
          <Textarea
            id={fieldId("description")}
            name="description"
            rows={4}
            defaultValue={initial?.description ?? ""}
            aria-invalid={!!errors.description}
            aria-describedby={describedBy("description", false)}
          />
          {error("description")}
        </div>
        {field("profileImageUrl", "Profile image URL", {
          type: "url",
          inputMode: "url",
          hint: "Link to an image already hosted elsewhere (https://…). Files are not uploaded here.",
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Online presence and contact</h2>
        <p className="text-xs text-muted-foreground">All optional. An Instagram profile alone is enough; a website is not required.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("instagram", "Instagram", { hint: "Handle or profile URL. Stored as a handle, e.g. @photos → photos." })}
          {field("website", "Website or portfolio", { type: "url", inputMode: "url", hint: "https://…" })}
          {field("email", "Email", { type: "email", inputMode: "email", autoComplete: "off" })}
          {field("phone", "Phone", { type: "tel", inputMode: "tel", autoComplete: "off" })}
          {field("city", "City")}
          <div className="space-y-1.5">
            <label htmlFor={fieldId("countryCode")} className="text-sm font-medium">
              Country
            </label>
            <SearchableSelect
              id={fieldId("countryCode")}
              name="countryCode"
              groups={countryGroups}
              defaultValue={initial?.countryCode ?? ""}
              placeholder="Select a country…"
              searchPlaceholder="Search countries…"
              emptyMessage="No country found."
              invalid={!!errors.countryCode}
              describedBy={describedBy("countryCode", false)}
            />
            {error("countryCode")}
          </div>
        </div>
      </section>

      <fieldset className="space-y-3" aria-describedby={fieldId("disciplineIds-hint")}>
        <legend className="text-base font-semibold">Disciplines covered</legend>
        <p id={fieldId("disciplineIds-hint")} className="text-xs text-muted-foreground">
          Optional. Pick every discipline this photographer covers, regardless of events. Used to find photographers by sport.
        </p>
        {disciplines.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No disciplines yet. Load the catalog seed first (<code>pnpm db:seed</code>).
          </p>
        )}
        {[...sportGroups].map(([sportName, options]) => (
          <div key={sportName} className="space-y-1">
            <p className="text-sm font-medium">{sportName}</p>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {options.map((option) => (
                <label key={option.id} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={disciplineIds.has(option.id)}
                    onChange={(event) => toggleDiscipline(option.id, event.target.checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        {error("disciplineIds")}
      </fieldset>

      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Saved profiles are classified as photographers automatically. Event assignments and photo galleries are managed in later
        stages.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create photographer"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/photographers">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
