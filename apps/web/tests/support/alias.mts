import { fileURLToPath } from "node:url"

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Path aliases shared by the vitest configs (mirrors tsconfig `paths`).
export const alias = {
  "@": fromRoot("../../src"),
  // `server-only` throws outside Next's server bundle; stub it for tests.
  "server-only": fromRoot("./server-only-stub.ts"),
}
