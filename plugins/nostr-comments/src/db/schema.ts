import { pgTable, text, timestamp, uniqueIndex, integer, boolean } from "drizzle-orm/pg-core";

/**
 * Cached Nostr comments — mirror of kind:1 events for fast reads.
 * Source of truth is the Nostr relay; this is a read cache.
 */
export const comments = pgTable(
  "nostr_comments",
  {
    id: text("id").primaryKey(), // nostr event id
    projectId: text("project_id").notNull(),
    pubkey: text("pubkey").notNull(),
    npub: text("npub").notNull(),
    author: text("author").notNull(), // near account or display name
    content: text("content").notNull(),
    replyTo: text("reply_to"), // parent event id
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
    cachedAt: timestamp("cached_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("nostr_comments_project_created_idx").on(table.projectId, table.createdAt),
    uniqueIndex("nostr_comments_pubkey_idx").on(table.pubkey),
  ],
);

/**
 * Cached Nostr news posts — mirror of kind:30078 events.
 */
export const newsPosts = pgTable(
  "nostr_news_posts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    pubkey: text("pubkey").notNull(),
    npub: text("npub").notNull(),
    author: text("author").notNull(),
    type: text("type").notNull(), // update | milestone | funding | announcement
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull(),
    cachedAt: timestamp("cached_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("nostr_news_project_type_idx").on(table.projectId, table.type),
  ],
);

/**
 * NEP-413 attestations linking NEAR accounts to Nostr npubs.
 */
export const attestations = pgTable(
  "nostr_attestations",
  {
    id: text("id").primaryKey().default(`att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
    accountId: text("account_id").notNull(),
    nostrPubkey: text("nostr_pubkey").notNull(),
    npub: text("npub").notNull(),
    publicKey: text("public_key").notNull(),
    signature: text("signature").notNull(),
    nonce: text("nonce").notNull(),
    recipient: text("recipient").notNull(),
    message: text("message").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("nostr_attestation_account_idx").on(table.accountId),
    uniqueIndex("nostr_attestation_pubkey_idx").on(table.nostrPubkey),
  ],
);
