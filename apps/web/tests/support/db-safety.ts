// Database safety guards. No imports: this file is also run directly by node
// (scripts/with-db-env.ts), so keep it dependency-free.

export const TEST_DATABASE = "events_test"
export const DEV_DATABASE = "events_dev"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])
const FORBIDDEN_DATABASES = new Set([
  DEV_DATABASE,
  "accounting_system_dev",
  "accounting_system_test",
])
const REMOTE_MARKERS = ["supabase", "pooler", "neon.tech", "amazonaws", "render.com"]

export class UnsafeDatabaseError extends Error {
  constructor(reason: string) {
    super(`Unsafe database target: ${reason}. Aborting.`)
    this.name = "UnsafeDatabaseError"
  }
}

function parse(url: string | undefined) {
  if (!url) throw new UnsafeDatabaseError("DATABASE_URL is not set")
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new UnsafeDatabaseError("DATABASE_URL is not a valid URL")
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new UnsafeDatabaseError("DATABASE_URL is not a PostgreSQL URL")
  }
  const lower = url.toLowerCase()
  const marker = REMOTE_MARKERS.find((m) => lower.includes(m))
  if (marker) throw new UnsafeDatabaseError(`URL references remote service "${marker}"`)
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new UnsafeDatabaseError(`host "${parsed.hostname}" is not localhost or 127.0.0.1`)
  }
  // libpq query params can override the host.
  for (const key of ["host", "hostaddr"]) {
    if (parsed.searchParams.has(key)) {
      throw new UnsafeDatabaseError(`query parameter "${key}" is not allowed`)
    }
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  return { database }
}

/** Throws unless the URL is a local `events_test` database. Returns the URL. */
export function assertSafeTestDatabaseUrl(url: string | undefined): string {
  const { database } = parse(url)
  if (FORBIDDEN_DATABASES.has(database) || database.startsWith("accounting_system")) {
    throw new UnsafeDatabaseError(`database "${database}" is forbidden for tests`)
  }
  if (database !== TEST_DATABASE) {
    throw new UnsafeDatabaseError(`database "${database}" is not exactly "${TEST_DATABASE}"`)
  }
  return url as string
}

/** Throws unless the URL is a local `events_dev` database. Returns the URL. */
export function assertSafeDevDatabaseUrl(url: string | undefined): string {
  const { database } = parse(url)
  if (database !== DEV_DATABASE) {
    throw new UnsafeDatabaseError(`database "${database}" is not exactly "${DEV_DATABASE}"`)
  }
  return url as string
}
