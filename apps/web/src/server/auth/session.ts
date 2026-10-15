import "server-only"
import { auth } from "./auth.ts"

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export class AuthorizationError extends Error {
  constructor(readonly code: "unauthorized" | "forbidden") {
    super(code === "unauthorized" ? "Authentication required." : "Administrator access required.")
    this.name = "AuthorizationError"
  }
}

/** Better Auth stores roles as a comma-separated string. */
export function hasAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").split(",").some((r) => r.trim() === "admin")
}

async function requestHeaders(): Promise<Headers> {
  const { headers } = await import("next/headers")
  return headers()
}

/** Current session (or null), validated by Better Auth against the database. */
export async function getSession(headers?: Headers): Promise<Session | null> {
  return auth.api.getSession({ headers: headers ?? (await requestHeaders()) })
}

/**
 * Authorization gate. Call it FIRST in every Server Action and Route Handler that
 * mutates data or reads admin-only data. Throws AuthorizationError otherwise.
 * `headers` is only for tests; it defaults to the current request.
 */
export async function requireAdmin(headers?: Headers): Promise<Session> {
  const session = await getSession(headers)
  if (!session) throw new AuthorizationError("unauthorized")
  if (session.user.banned || !hasAdminRole(session.user.role)) throw new AuthorizationError("forbidden")
  return session
}
