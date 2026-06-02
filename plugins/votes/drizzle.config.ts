import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.VOTES_DATABASE_URL || "pglite:.bos/votes/:memory:",
  },
  verbose: true,
  strict: true,
});
