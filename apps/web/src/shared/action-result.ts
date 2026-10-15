import type { z } from "zod"

// Server Actions return an ActionResult for EXPECTED failures (validation,
// authorization, missing rows, conflicts). Unexpected errors are thrown and
// handled by Next.js error boundaries; do not catch-and-wrap them.

export type FieldErrors = Record<string, string[]>

export type ActionErrorCode = "validation" | "unauthorized" | "forbidden" | "not_found" | "conflict"

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ActionErrorCode; message: string; fieldErrors?: FieldErrors } }

export function ok(): { ok: true; data: undefined }
export function ok<T>(data: T): { ok: true; data: T }
export function ok(data?: unknown) {
  return { ok: true as const, data }
}

export function fail(code: ActionErrorCode, message: string, fieldErrors?: FieldErrors) {
  return { ok: false as const, error: { code, message, fieldErrors } }
}

export function addFieldError(errors: FieldErrors, field: string, message: string) {
  ;(errors[field] ??= []).push(message)
}

export function validationFailure(fieldErrors: FieldErrors) {
  return fail("validation", "Please correct the highlighted fields.", fieldErrors)
}

export function fromZodError(error: z.ZodError) {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) addFieldError(fieldErrors, issue.path.join("."), issue.message)
  return validationFailure(fieldErrors)
}

/** Structural check (no Prisma import) for a Prisma known-request error code, e.g. "P2002" unique violation. */
export function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === code
}
