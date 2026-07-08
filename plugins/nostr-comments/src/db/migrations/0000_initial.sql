-- Nostr Comments Plugin Migrations
-- Generated for drizzle-kit / PostgreSQL (PGlite compatible)

-- ─── Comments table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nostr_comments" (
  "id"           text PRIMARY KEY,
  "project_id"   text NOT NULL,
  "pubkey"       text NOT NULL,
  "npub"         text NOT NULL,
  "author"       text NOT NULL,
  "content"      text NOT NULL,
  "reply_to"     text,
  "created_at"   timestamptz NOT NULL,
  "cached_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "nostr_comments_project_created_idx"
  ON "nostr_comments" ("project_id", "created_at");

CREATE INDEX IF NOT EXISTS "nostr_comments_pubkey_idx"
  ON "nostr_comments" ("pubkey");

-- ─── News posts table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nostr_news_posts" (
  "id"           text PRIMARY KEY,
  "project_id"   text NOT NULL,
  "pubkey"       text NOT NULL,
  "npub"         text NOT NULL,
  "author"       text NOT NULL,
  "type"         text NOT NULL,
  "title"        text NOT NULL,
  "body"         text NOT NULL,
  "created_at"   timestamptz NOT NULL,
  "updated_at"   timestamptz NOT NULL,
  "cached_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "nostr_news_project_type_idx"
  ON "nostr_news_posts" ("project_id", "type");

-- ─── Attestations table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "nostr_attestations" (
  "id"            text PRIMARY KEY,
  "account_id"    text NOT NULL,
  "nostr_pubkey"  text NOT NULL,
  "npub"          text NOT NULL,
  "public_key"    text NOT NULL,
  "signature"     text NOT NULL,
  "nonce"         text NOT NULL,
  "recipient"     text NOT NULL,
  "message"       text NOT NULL,
  "verified"      boolean NOT NULL DEFAULT false,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "nostr_attestation_account_idx"
  ON "nostr_attestations" ("account_id");

CREATE UNIQUE INDEX IF NOT EXISTS "nostr_attestation_pubkey_idx"
  ON "nostr_attestations" ("nostr_pubkey");
