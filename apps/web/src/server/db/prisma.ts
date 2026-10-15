import "server-only"
import { PrismaClient } from "@prisma/client"

// DATABASE_URL is read by Prisma from the environment (Next.js loads .env;
// tests and db scripts load .env.test explicitly and pass the safety guard).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
