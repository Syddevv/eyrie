import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    iconType: text("icon_type").notNull().default("vector"),
    iconName: text("icon_name"),
    iconImageUri: text("icon_image_uri"),
    emoji: text("emoji"),
    color: text("color"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    lastSyncedAt: text("last_synced_at"),
    syncError: text("sync_error"),
  },
  (table) => ({
    userIdx: index("categories_user_idx").on(table.userId),
    typeIdx: index("categories_type_idx").on(table.type),
    nameIdx: index("categories_name_idx").on(table.name),
    archivedIdx: index("categories_archived_idx").on(table.isArchived),
  })
);
