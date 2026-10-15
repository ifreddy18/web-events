import { defineConfig } from "vitest/config"
import { alias } from "./tests/support/alias.mts"

// Database integration tests. Always run against events_test only:
// the setup file loads .env.test and aborts if the target is unsafe.
export default defineConfig({
  resolve: { alias },
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
