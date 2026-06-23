import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NOTIFICATIONS_DATABASE_URL || "pglite:.bos/notifications/:memory:",
  },
  verbose: true,
  strict: true,
});
