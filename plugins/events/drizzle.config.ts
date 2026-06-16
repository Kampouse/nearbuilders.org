import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.EVENTS_DATABASE_URL || "pglite:.bos/events/:memory:",
  },
  verbose: true,
  strict: true,
});
