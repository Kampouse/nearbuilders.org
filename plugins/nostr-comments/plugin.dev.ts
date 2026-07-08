import { defineDevConfig } from "every-plugin/dev";

export default defineDevConfig({
  plugin: "./src/index.ts",
  port: 3030,
  rspack: {
    name: "nostr_comments",
    exposes: {
      "./remoteEntry": "./src/index.ts",
    },
    shared: {
      react: { singleton: true, requiredVersion: "^19.0.0" },
      "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
      "@tanstack/react-query": { singleton: true, requiredVersion: "^5.0.0" },
    },
  },
  variables: {
    // ─── Configure your relays here ───────────────────────────────
    // Comma-separated list of Nostr relay URLs
    relays: "",
    fallbackRelays: "",
    // ──────────────────────────────────────────────────────────────
    backgroundEnabled: "true",
    backgroundIntervalMs: "5000",
  },
  secrets: {
    NOSTR_COMMENTS_DATABASE_URL: "pglite:.bos/nostr-comments/:memory:",
  },
});
