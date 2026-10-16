"use client"

import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { addEventPhotographer, updateEventPhotographer } from "../actions"
import type { EditionPhotographer, PhotographerSearchItem } from "../queries"
import { ACCREDITATION_DETAILS, type Accreditation } from "../rules"
import { ACCREDITATIONS } from "../schemas"
import { describePhotographer, PhotographerPicker } from "./photographer-picker"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

/** `"new"` = adding, otherwise the assignment being edited. */
export type PhotographerDialogTarget = "new" | EditionPhotographer

/**
 * Add / edit dialog of the edition's Photographers section. Adding picks an existing profile (it never creates
 * one); editing changes only accreditation and the note, because the photographer is the assignment's identity.
 * The dialog content is mounted only while open, so every opening starts with fresh state.
 */
export function EventPhotographerDialog({
  eventEditionId,
  target,
  onClose,
  onSaved,
}: {
  eventEditionId: string
  target: PhotographerDialogTarget | null
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {target !== null && (
          <DialogBody key={target === "new" ? "new" : target.id} eventEditionId={eventEditionId} target={target} onClose={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DialogBody({
  eventEditionId,
  target,
  onClose,
  onSaved,
}: {
  eventEditionId: string
  target: PhotographerDialogTarget
  onClose: () => void
  onSaved: () => void
}) {
  const formId = useId()
  const editing = target === "new" ? null : target
  const [selected, setSelected] = useState<PhotographerSearchItem | null>(null)
  const [accreditation, setAccreditation] = useState<Accreditation>(editing?.accreditation ?? "UNKNOWN")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing && !selected) {
      setErrors({ providerId: ["Select a photographer."] })
      return
    }
    setPending(true)
    setErrors({})
    setFormError(null)
    const details = { accreditation, description }
    let result
    try {
      result = editing
        ? await updateEventPhotographer(editing.id, details)
        : await addEventPhotographer({ ...details, eventEditionId, providerId: selected?.id })
    } catch {
      setPending(false)
      setFormError("Something went wrong. Please try again.")
      return
    }
    if (result.ok) {
      onSaved()
      return
    }
    setPending(false)
    setErrors(result.error.fieldErrors ?? {})
    setFormError(result.error.code === "validation" ? null : result.error.message)
  }

  const error = (name: string) =>
    errors[name] && (
      <p id={`${formId}-${name}-error`} className="text-sm text-destructive">
        {errors[name].join(" ")}
      </p>
    )
  const chosen = editing?.photographer ?? selected

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit photographer assignment" : "Add photographer"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change how this photographer is recorded for the edition. The profile itself is edited in Photographers."
            : "Link an existing photographer profile to this edition."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {editing ? (
          <p className="text-sm">
            <span className="font-medium">{editing.photographer.name}</span>
            <span className="block text-xs text-muted-foreground">{describePhotographer({ ...editing.photographer, slug: editing.photographer.slug })}</span>
          </p>
        ) : (
          <>
            <PhotographerPicker eventEditionId={eventEditionId} selected={selected} onSelect={setSelected} />
            {selected && (
              <p className="text-sm" role="status">
                Selected: <span className="font-medium">{selected.name}</span>
              </p>
            )}
            {error("providerId")}
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-accreditation`} className="text-sm font-medium">
            Participation
          </label>
          <select
            id={`${formId}-accreditation`}
            value={accreditation}
            onChange={(event) => setAccreditation(event.target.value as Accreditation)}
            className={selectClass}
            aria-describedby={`${formId}-accreditation-hint`}
          >
            {ACCREDITATIONS.map((value) => (
              <option key={value} value={value}>
                {ACCREDITATION_DETAILS[value].label}
              </option>
            ))}
          </select>
          <ul id={`${formId}-accreditation-hint`} className="space-y-0.5 text-xs text-muted-foreground">
            {ACCREDITATIONS.map((value) => (
              <li key={value}>
                <span className="font-medium">{ACCREDITATION_DETAILS[value].label}:</span> {ACCREDITATION_DETAILS[value].help}
              </li>
            ))}
            <li>The same photographer can be official in one edition and independent in another.</li>
          </ul>
          {error("accreditation")}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${formId}-description`} className="text-sm font-medium">
            Note (optional)
          </label>
          <Textarea
            id={`${formId}-description`}
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={!!errors.description}
            aria-describedby={[`${formId}-description-hint`, errors.description && `${formId}-description-error`].filter(Boolean).join(" ")}
          />
          <p id={`${formId}-description-hint`} className="text-xs text-muted-foreground">
            Anything worth remembering about this photographer at this edition. Gallery links are added separately later.
          </p>
          {error("description")}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : chosen ? `Add ${chosen.name}` : "Add photographer"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  )
}
