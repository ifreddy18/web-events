"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteLocation } from "../actions"

export function DeleteLocationButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const result = await deleteLocation(id)
      if (result.ok) {
        setOpen(false)
        router.push("/admin/locations?notice=deleted")
        router.refresh()
        return
      }
      setError(result.error.message)
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" aria-label={`Delete ${label}`}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete location?</DialogTitle>
          <DialogDescription>
            “{label}” will be removed from the admin lists. Its slug stays reserved. Locations used by editions or
            competitions cannot be deleted.
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
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
