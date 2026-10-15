import "server-only"
import { fail } from "@/shared/action-result"
import { AuthorizationError, requireAdmin } from "./session"

/**
 * First line of every admin Server Action: returns a failure ActionResult when the caller
 * is not an admin, or null when allowed. Unexpected errors are rethrown.
 */
export async function denied() {
  try {
    await requireAdmin()
    return null
  } catch (e) {
    if (e instanceof AuthorizationError) return fail(e.code, e.message)
    throw e
  }
}
