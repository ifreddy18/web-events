import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Empty when unset: only db commands need it and they fail with a clear connection error.
    url: process.env["DATABASE_URL"] ?? "",
  },
});
