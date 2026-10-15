"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "../auth-client"
import { loginSchema } from "../schemas"

export function LoginForm() {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setPending(true)
    const { error } = await authClient.signIn.email(parsed.data)
    setPending(false)
    if (error) {
      setFormError(
        error.status === 429
          ? "Too many attempts. Try again in a minute."
          : "Invalid email or password.",
      )
      return
    }
    router.replace("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="username" aria-invalid={!!errors.email} />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>
      {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
