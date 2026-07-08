import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NOSTR_COMMENTS_DATABASE_URL || "pglite:.bos/nostr-comments/:memory:",
  },
  verbose: true,
  strict: true,
});
