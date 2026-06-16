import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
