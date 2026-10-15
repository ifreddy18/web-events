import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins"
import { prisma } from "../db/prisma.ts"

// Relative `.ts` imports: scripts/create-admin.ts loads this file with plain node.

const secret = process.env.BETTER_AUTH_SECRET
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is missing or shorter than 32 characters (see .env.example).")
}

// Admin-only authentication: email + password, no public sign-up, no OAuth.
// Sessions are database-backed with no cookie cache, so revocation is immediate.
export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: { database: { generateId: "uuid" } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, customRules: { "/sign-in/email": { window: 60, max: 5 } } },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
})
