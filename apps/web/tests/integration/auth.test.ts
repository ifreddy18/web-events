import type { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { auth } from "@/server/auth/auth"
import { createUserWithPassword } from "@/server/auth/provision"
import { AuthorizationError, getSession, requireAdmin } from "@/server/auth/session"
import { cleanupFixtures, createTestClient, P } from "./helpers"

const PASSWORD = "correct-horse-battery"
let db: PrismaClient

async function makeUser(key: string, role: "admin" | "user") {
  return createUserWithPassword({ email: `${P}${key}@example.test`, name: `${P}${key}`, password: PASSWORD, role })
}

/** Signs in through Better Auth and returns request headers carrying the session cookie. */
async function signIn(key: string) {
  const { headers, response } = await auth.api.signInEmail({
    body: { email: `${P}${key}@example.test`, password: PASSWORD },
    returnHeaders: true,
  })
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
  return { headers: new Headers({ cookie }), token: response.token }
}

const code = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (e) {
    return e instanceof AuthorizationError ? e.code : "other"
  }
  return "none"
}

beforeAll(async () => {
  db = createTestClient()
  await cleanupFixtures(db)
  await makeUser("admin", "admin")
  await makeUser("plain", "user")
})

afterAll(async () => {
  if (!db) return
  await cleanupFixtures(db)
  await db.$disconnect()
})

describe("requireAdmin", () => {
  it("denies unauthenticated requests", async () => {
    expect(await code(requireAdmin(new Headers()))).toBe("unauthorized")
  })

  it("denies authenticated non-admin users", async () => {
    const { headers } = await signIn("plain")
    expect(await getSession(headers)).not.toBeNull()
    expect(await code(requireAdmin(headers))).toBe("forbidden")
  })

  it("grants administrators", async () => {
    const { headers } = await signIn("admin")
    const session = await requireAdmin(headers)
    expect(session.user.email).toBe(`${P}admin@example.test`)
    expect(session.user.role).toBe("admin")
  })

  it("denies a banned administrator", async () => {
    await makeUser("banned", "admin")
    const { headers } = await signIn("banned")
    await db.user.update({ where: { email: `${P}banned@example.test` }, data: { banned: true } })
    expect(await code(requireAdmin(headers))).toBe("forbidden")
  })
})

describe("sign-in and sign-up", () => {
  it("rejects invalid credentials", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: `${P}admin@example.test`, password: "wrong-password-123" } }),
    ).rejects.toThrow()
    await expect(
      auth.api.signInEmail({ body: { email: `${P}nobody@example.test`, password: PASSWORD } }),
    ).rejects.toThrow()
  })

  it("has public registration disabled", async () => {
    const email = `${P}intruder@example.test`
    await expect(auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Intruder" } })).rejects.toThrow()
    expect(await db.user.count({ where: { email } })).toBe(0)
  })

  it("stores a hashed password, never plaintext", async () => {
    const account = await db.account.findFirstOrThrow({ where: { user: { email: `${P}admin@example.test` } } })
    expect(account.password).toBeTruthy()
    expect(account.password).not.toContain(PASSWORD)
  })

  it("refuses to provision weak passwords and duplicate emails", async () => {
    await expect(
      createUserWithPassword({ email: `${P}weak@example.test`, name: "x", password: "short", role: "admin" }),
    ).rejects.toThrow(/at least/)
    await expect(makeUser("admin", "admin")).rejects.toThrow(/already exists/)
  })
})

describe("session lifecycle", () => {
  it("validates a session from its cookie", async () => {
    const { headers } = await signIn("admin")
    const session = await getSession(headers)
    expect(session?.user.email).toBe(`${P}admin@example.test`)
  })

  it("rejects requests with a forged token", async () => {
    expect(await getSession(new Headers({ cookie: "better-auth.session_token=forged.token" }))).toBeNull()
  })

  it("stops validating an expired session", async () => {
    const { headers, token } = await signIn("admin")
    await db.session.update({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } })
    expect(await getSession(headers)).toBeNull()
    expect(await code(requireAdmin(headers))).toBe("unauthorized")
  })

  it("stops validating a revoked session immediately", async () => {
    const { headers, token } = await signIn("admin")
    await db.session.delete({ where: { token } })
    expect(await code(requireAdmin(headers))).toBe("unauthorized")
  })

  it("ends the session on sign-out", async () => {
    const { headers } = await signIn("admin")
    expect(await getSession(headers)).not.toBeNull()
    await auth.api.signOut({ headers })
    expect(await getSession(headers)).toBeNull()
  })
})
