import "server-only"
import { auth } from "./auth.ts"

/**
 * Creates a user with a credential account, bypassing the (disabled) public sign-up.
 * Only used by scripts/create-admin.ts and tests; never expose it through a route.
 */
export async function createUserWithPassword(input: {
  email: string
  name: string
  password: string
  role: "admin" | "user"
}) {
  const ctx = await auth.$context
  const email = input.email.trim().toLowerCase()
  if (input.password.length < ctx.password.config.minPasswordLength) {
    throw new Error(`Password must be at least ${ctx.password.config.minPasswordLength} characters.`)
  }
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error("A user with this email already exists.")
  }
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: input.name.trim(),
      role: input.role,
      emailVerified: true,
    },
    { method: "email-password" },
  )
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(input.password),
  })
  return user
}
