#!/usr/bin/env node

/**
 * Database Migration Test Script
 * Tests that migrations can be applied safely and idempotently
 * Validates schema consistency
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../test-migration-db.sqlite");

// Clean up any existing test database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("✓ Cleaned up previous test database");
}

// Create test database
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("\n📋 Starting Migration Tests...\n");

// Test 1: Create base table
console.log("Test 1: Creating base accounts table...");
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'PHP',
      account_number_last4 TEXT,
      color TEXT,
      icon TEXT,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log("  ✓ Base table created successfully\n");
} catch (err) {
  console.error("  ✗ Failed to create base table:", err.message, "\n");
  process.exit(1);
}

// Test 2: Apply first migration (idempotent add account_holder_name)
console.log(
  "Test 2: Applying migration 0006_accounts_holder_name (first time)...",
);
try {
  const sql =
    "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `account_holder_name` TEXT;";
  db.exec(sql);
  console.log("  ✓ Migration applied successfully (first run)\n");
} catch (err) {
  console.error("  ✗ Failed to apply migration:", err.message, "\n");
  process.exit(1);
}

// Test 3: Apply same migration again (should be idempotent)
console.log(
  "Test 3: Applying migration 0006_accounts_holder_name (second time - idempotency check)...",
);
try {
  const sql =
    "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `account_holder_name` TEXT;";
  db.exec(sql);
  console.log("  ✓ Migration applied again without error (idempotent!)\n");
} catch (err) {
  console.error(
    "  ✗ Failed on second run (idempotency broken):",
    err.message,
    "\n",
  );
  process.exit(1);
}

// Test 4: Apply other migrations
console.log("Test 4: Applying additional sync columns...");
const syncMigrations = [
  "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `deleted_at` TEXT;",
  "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `sync_status` TEXT NOT NULL DEFAULT 'synced';",
  "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `last_synced_at` TEXT;",
  "ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `sync_error` TEXT;",
];

for (let i = 0; i < syncMigrations.length; i++) {
  try {
    db.exec(syncMigrations[i]);
    console.log(`  ✓ Migration ${i + 1}/4 applied successfully`);
  } catch (err) {
    console.error(`  ✗ Migration ${i + 1}/4 failed:`, err.message);
    process.exit(1);
  }
}
console.log();

// Test 5: Verify schema
console.log("Test 5: Verifying final schema...");
const tableInfo = db.prepare("PRAGMA table_info(accounts)").all();
const columns = tableInfo.map((c) => c.name);

const expectedColumns = [
  "id",
  "user_id",
  "type",
  "name",
  "balance",
  "currency_code",
  "account_number_last4",
  "color",
  "icon",
  "is_hidden",
  "created_at",
  "updated_at",
  "account_holder_name",
  "deleted_at",
  "sync_status",
  "last_synced_at",
  "sync_error",
];

const missingColumns = expectedColumns.filter((col) => !columns.includes(col));
const extraColumns = columns.filter((col) => !expectedColumns.includes(col));

if (missingColumns.length === 0) {
  console.log("  ✓ All expected columns present:");
  expectedColumns.forEach((col) => console.log(`    - ${col}`));
} else {
  console.error("  ✗ Missing columns:", missingColumns);
  process.exit(1);
}

if (extraColumns.length > 0) {
  console.warn("  ⚠ Unexpected extra columns:", extraColumns);
}

console.log();

// Test 6: Verify column types and constraints
console.log("Test 6: Verifying column definitions...");
const accountHolderNameCol = tableInfo.find(
  (c) => c.name === "account_holder_name",
);
const syncStatusCol = tableInfo.find((c) => c.name === "sync_status");

console.log(
  `  - account_holder_name: type=${accountHolderNameCol.type}, notnull=${accountHolderNameCol.notnull}`,
);
console.log(
  `  - sync_status: type=${syncStatusCol.type}, notnull=${syncStatusCol.notnull}, default='${syncStatusCol.dflt_value}'`,
);

if (accountHolderNameCol.type === "text" && syncStatusCol.type === "text") {
  console.log("  ✓ Column types are correct\n");
} else {
  console.error("  ✗ Column types are incorrect\n");
  process.exit(1);
}

// Test 7: Test data operations
console.log("Test 7: Testing data insertion with new columns...");
try {
  const insertStmt = db.prepare(`
    INSERT INTO accounts (
      id, user_id, type, name, balance, currency_code,
      created_at, updated_at, account_holder_name, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    "test-id-1",
    "user-1",
    "bank",
    "Test Bank Account",
    1000.0,
    "PHP",
    new Date().toISOString(),
    new Date().toISOString(),
    "John Doe",
    "synced",
  );

  const result = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get("test-id-1");
  console.log("  ✓ Data inserted successfully");
  console.log(`    - account_holder_name: ${result.account_holder_name}`);
  console.log(`    - sync_status: ${result.sync_status}\n`);
} catch (err) {
  console.error("  ✗ Failed to insert data:", err.message, "\n");
  process.exit(1);
}

// Cleanup
db.close();
fs.unlinkSync(dbPath);

console.log("✅ All migration tests passed!\n");
console.log("Summary:");
console.log("  ✓ Migrations are idempotent (IF NOT EXISTS works)");
console.log("  ✓ Schema is consistent with expected columns");
console.log("  ✓ Column definitions are correct");
console.log("  ✓ Data operations work correctly\n");
console.log("The database migration system is ready for production.\n");
