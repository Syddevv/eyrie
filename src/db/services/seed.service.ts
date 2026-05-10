import { db } from "../client";
import { categories, currencies, users } from "../schema";
import {
  DEFAULT_CURRENCIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_CURRENCY_CODE,
  SYSTEM_CATEGORY_USER_ID,
} from "../utils/constants";
import { nowIso } from "../utils/time";

let hasSeeded = false;

export async function seedDatabase() {
  if (hasSeeded) {
    return;
  }

  const timestamp = nowIso();

  await db.insert(currencies).values([...DEFAULT_CURRENCIES]).onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: SYSTEM_CATEGORY_USER_ID,
      fullName: "Eyrie System",
      email: "system@local.eyrie",
      currencyCode: DEFAULT_CURRENCY_CODE,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoNothing();

  await db
    .insert(categories)
    .values([
      ...DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
        id: category.id,
        userId: SYSTEM_CATEGORY_USER_ID,
        type: "expense" as const,
        name: category.name,
        icon: category.icon,
        iconType: "vector" as const,
        iconName: category.icon,
        color: category.color,
        isDefault: true,
        isSystem: true,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((category) => ({
        id: category.id,
        userId: SYSTEM_CATEGORY_USER_ID,
        type: "income" as const,
        name: category.name,
        icon: category.icon,
        iconType: "vector" as const,
        iconName: category.icon,
        color: category.color,
        isDefault: true,
        isSystem: true,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    ])
    .onConflictDoNothing();

  hasSeeded = true;
}
