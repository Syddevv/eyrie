import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";
import { DATABASE_NAME } from "./utils/constants";

export const expoDb = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

expoDb.execSync("PRAGMA journal_mode = WAL;");
expoDb.execSync("PRAGMA foreign_keys = ON;");
try {
  expoDb.execSync(
    "ALTER TABLE accounts ADD COLUMN account_holder_name TEXT;",
  );
} catch {
  // Column already exists on existing installs.
}

export const db = drizzle(expoDb, { schema });
