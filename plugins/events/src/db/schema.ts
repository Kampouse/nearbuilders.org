import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content"),
    status: text("status").notNull().default("active"),
    visibility: text("visibility").notNull().default("public"),
    lumaUrl: text("luma_url"),
    startAt: timestamp("start_at", { mode: "date", withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { mode: "date", withTimezone: true }),
    location: text("location"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("events_owner_slug_unique").on(table.ownerId, table.slug)],
);

export const eventParticipants = pgTable(
  "event_participants",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    walletAddress: text("wallet_address"),
    displayName: text("display_name"),
    role: text("role").notNull().default("participant"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("event_participants_event_user_unique").on(table.eventId, table.userId),
    index("event_participants_event_idx").on(table.eventId),
    index("event_participants_user_idx").on(table.userId),
  ],
);
