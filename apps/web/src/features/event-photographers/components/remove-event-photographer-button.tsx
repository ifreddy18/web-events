"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { removeEventPhotographer } from "../actions"

/** Removing only ends the assignment to this edition; it never deletes the photographer profile. */
export function RemoveEventPhotographerButton({ id, label, onRemoved }: { id: string; label: string; onRemoved: () => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const result = await removeEventPhotographer(id)
      if (result.ok) {
        setOpen(false)
        onRemoved()
        setPending(false)
        return
      }
      setError(result.error.message)
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setPending(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" aria-label={`Remove ${label} from this edition`}>
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove from this edition?</DialogTitle>
          <DialogDescription>
            “{label}” will no longer be listed as a photographer of this edition. Their profile, and their assignments to other editions,
            are not affected. To delete the profile itself, use Photographers.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
