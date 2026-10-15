"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult, FieldErrors } from "@/shared/action-result"
import { createOrganizer, updateOrganizer } from "../actions"

type Values = {
  name: string
  slug: string
  description: string
  website: string
  instagram: string
  logoUrl: string
}

type FieldOpts = { required?: boolean; hint?: string; type?: "url"; multiline?: boolean }

export function OrganizerForm({ id, initial }: { id?: string; initial?: Partial<Values> }) {
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
      result = id ? await updateOrganizer(id, values) : await createOrganizer(values)
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      router.push(`/admin/organizers?notice=${id ? "updated" : "created"}`)
      router.refresh()
      return
    }
    setPending(false)
    setErrors(result.error.fieldErrors ?? {})
    setFormError(result.error.code === "validation" ? null : result.error.message)
  }

  const field = (name: keyof Values, label: string, opts: FieldOpts = {}) => {
    const common = {
      id: name,
      name,
      defaultValue: initial?.[name] ?? "",
      required: opts.required,
      "aria-invalid": !!errors[name],
      "aria-describedby": errors[name] ? `${name}-error` : undefined,
    }
    return (
      <div key={name} className="space-y-1.5">
        <label htmlFor={name} className="text-sm font-medium">
          {label}
          {opts.required && <span aria-hidden> *</span>}
        </label>
        {opts.multiline ? <Textarea rows={4} {...common} /> : <Input inputMode={opts.type} {...common} />}
        {opts.hint && !errors[name] && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
        {errors[name] && (
          <p id={`${name}-error`} className="text-sm text-destructive">
            {errors[name].join(" ")}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      {field("name", "Name", { required: true })}
      {field("slug", "Slug", {
        hint: id ? "Used in public URLs. Changing it changes the URL." : "Leave empty to generate from the name.",
      })}
      {field("description", "Description", { multiline: true })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("website", "Website", { type: "url", hint: "https://…" })}
        {field("instagram", "Instagram", { hint: "Handle or profile URL" })}
      </div>
      {field("logoUrl", "Logo URL", { type: "url", hint: "https://… (hosted image link)" })}
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create organizer"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/organizers">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
