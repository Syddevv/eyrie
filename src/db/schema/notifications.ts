import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("reminder"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: text("data"),
    actionUrl: text("action_url"),
    category: text("category").notNull().default("reminders"),
    priority: text("priority").notNull().default("medium"),
    icon: text("icon").notNull().default("bell"),
    color: text("color").notNull().default("#6366F1"),
    dedupeKey: text("dedupe_key").notNull().default(""),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    readAt: text("read_at"),
    scheduledFor: text("scheduled_for"),
    deliveredAt: text("delivered_at"),
    deliveryState: text("delivery_state").notNull().default("delivered"),
    localScheduleId: text("local_schedule_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    readIdx: index("notifications_read_idx").on(table.isRead),
    dedupeIdx: index("notifications_dedupe_idx").on(
      table.userId,
      table.dedupeKey,
    ),
  })
);
