import { defineConfig } from "vitest/config"
import { alias } from "./tests/support/alias.mts"

export default defineConfig({
  resolve: { alias },
  test: {
    name: "unit",
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
})
