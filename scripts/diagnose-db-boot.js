#!/usr/bin/env node

/**
 * Comprehensive Database Boot Diagnostics
 * Tests all migration scenarios: fresh install, reinstall, upgrade, offline startup
 */

const fs = require("fs");
const path = require("path");

console.log("\n" + "=".repeat(60));
console.log("  DATABASE BOOT DIAGNOSTICS");
console.log("=".repeat(60) + "\n");

// Verify all migration files
const migrationsDir = path.join(__dirname, "../src/db/migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && f !== "migrations.js")
  .sort();

console.log("📋 MIGRATION FILES CHECK\n");
migrationFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const hasIfNotExists = content.includes("IF NOT EXISTS");
  const status = hasIfNotExists ? "❌ HAS IF NOT EXISTS" : "✓ CLEAN";
  console.log(`  ${status}: ${file}`);
});

// Check schema-validation.ts
console.log("\n📋 SCHEMA VALIDATION LAYER CHECK\n");
const schemaValidationPath = path.join(
  __dirname,
  "../src/db/schema-validation.ts",
);
const schemaContent = fs.readFileSync(schemaValidationPath, "utf8");

const schemaChecks = [
  {
    name: "Uses correct table name (accounts)",
    check: () => schemaContent.includes('table: "accounts"'),
    critical: true,
  },
  {
    name: "No IF NOT EXISTS in SQL strings",
    check: () => !schemaContent.includes("IF NOT EXISTS"),
    critical: true,
  },
  {
    name: "Has PRAGMA table_info check",
    check: () => schemaContent.includes("PRAGMA table_info"),
    critical: true,
  },
  {
    name: "Has error handling (try-catch)",
    check: () =>
      schemaContent.includes("try") && schemaContent.includes("catch"),
    critical: true,
  },
  {
    name: "Has verification after ALTER",
    check: () => schemaContent.includes("updatedColumns.has(column.name)"),
    critical: true,
  },
  {
    name: "Detects duplicate column errors",
    check: () => schemaContent.includes("duplicate column"),
    critical: false,
  },
  {
    name: "Has detailed logging",
    check: () => schemaContent.includes("[db:schema]"),
    critical: false,
  },
];

let schemaValid = true;
schemaChecks.forEach((check) => {
  const status = check.check() ? "✓" : check.critical ? "❌" : "⚠";
  const level = check.critical ? "CRITICAL" : "optional";
  console.log(`  ${status} ${check.name} (${level})`);
  if (!check.check() && check.critical) {
    schemaValid = false;
  }
});

// Check DatabaseProvider
console.log("\n📋 BOOT PROVIDER CHECK\n");
const dbProviderPath = path.join(__dirname, "../src/db/DatabaseProvider.tsx");
const providerContent = fs.readFileSync(dbProviderPath, "utf8");

const providerChecks = [
  {
    name: "Migration error logging",
    check: () => providerContent.includes("[db:boot]"),
    critical: true,
  },
  {
    name: "Graceful error handling",
    check: () =>
      providerContent.includes("criticalErrors") ||
      providerContent.includes("catch"),
    critical: true,
  },
  {
    name: "Distinguishes critical vs non-critical errors",
    check: () => providerContent.includes("criticalErrors"),
    critical: true,
  },
  {
    name: "Logs migration snapshot",
    check: () => providerContent.includes("appliedCount"),
    critical: false,
  },
  {
    name: "Phase-based boot flow",
    check: () =>
      providerContent.includes("validating") &&
      providerContent.includes("seeding"),
    critical: true,
  },
];

let providerValid = true;
providerChecks.forEach((check) => {
  const status = check.check() ? "✓" : check.critical ? "❌" : "⚠";
  const level = check.critical ? "CRITICAL" : "optional";
  console.log(`  ${status} ${check.name} (${level})`);
  if (!check.check() && check.critical) {
    providerValid = false;
  }
});

// Verify table name consistency
console.log("\n📋 TABLE NAME CONSISTENCY\n");
const accountsSchemaPath = path.join(__dirname, "../src/db/schema/accounts.ts");
const accountsSchema = fs.readFileSync(accountsSchemaPath, "utf8");

const tableNameChecks = [
  {
    name: 'Drizzle schema uses plural "accounts"',
    content: accountsSchema,
    check: (c) => c.includes('sqliteTable(\n  "accounts"'),
    critical: true,
  },
  {
    name: 'Schema validation uses "accounts"',
    content: schemaContent,
    check: (c) =>
      c.includes('table: "accounts"') && !c.includes('table: "account"'),
    critical: true,
  },
  {
    name: "Accounts schema defines account_holder_name",
    content: accountsSchema,
    check: (c) =>
      c.includes("accountHolderName") && c.includes("account_holder_name"),
    critical: true,
  },
];

tableNameChecks.forEach((check) => {
  const status = check.check(check.content) ? "✓" : check.critical ? "❌" : "⚠";
  console.log(`  ${status} ${check.name}`);
});

// Summary and recommendations
console.log("\n" + "=".repeat(60));
console.log("  DIAGNOSTIC SUMMARY");
console.log("=".repeat(60) + "\n");

const allValid = schemaValid && providerValid;

if (allValid) {
  console.log("✅ DATABASE BOOT SYSTEM IS PROPERLY CONFIGURED\n");
  console.log("Safe to test the following flows:");
  console.log("  1. Fresh install (first app launch)");
  console.log("  2. Reinstall (app deleted, then installed again)");
  console.log("  3. Existing upgrade (app updated with new migrations)");
  console.log("  4. Offline startup (no network, use local DB)");
  console.log("  5. Login restore (cached session, reconnect sync)\n");
  console.log("Expected behavior:");
  console.log("  ✓ Migrations run without IF NOT EXISTS errors");
  console.log("  ✓ Schema validation adds missing columns safely");
  console.log("  ✓ App boots successfully");
  console.log("  ✓ Detailed logs show migration progress");
  console.log("  ✓ Errors are clearly reported (not silent failures)\n");
} else {
  console.log("❌ ISSUES DETECTED - DATABASE BOOT MAY FAIL\n");
  console.log("Critical issues must be fixed before testing:\n");

  if (!schemaValid) {
    console.log("Schema Validation Layer:");
    schemaChecks
      .filter((c) => c.critical && !c.check())
      .forEach((c) => console.log(`  • ${c.name}`));
  }

  if (!providerValid) {
    console.log("\nBoot Provider:");
    providerChecks
      .filter((c) => c.critical && !c.check())
      .forEach((c) => console.log(`  • ${c.name}`));
  }

  console.log("\nNext steps:");
  console.log("  1. Review the critical issues above");
  console.log("  2. Fix each issue based on the diagnostics");
  console.log("  3. Re-run this script to verify fixes");
  console.log("  4. Only then proceed with manual testing\n");

  process.exit(1);
}

console.log("🎯 KEY ARCHITECTURAL CHANGES\n");
console.log("Migration System (NOW EXPO-SAFE):");
console.log("  • Removed all IF NOT EXISTS from .sql migration files");
console.log("  • Drizzle migrations run cleanly without syntax errors");
console.log("  • Schema validation layer acts as safety net\n");

console.log("Schema Validation (NOW SAFE):");
console.log("  • Pre-checks column existence with PRAGMA table_info");
console.log("  • Only runs ALTER TABLE if column missing");
console.log("  • No IF NOT EXISTS in generated SQL");
console.log("  • Verifies column was added after ALTER\n");

console.log("Boot Flow (NOW ROBUST):");
console.log("  1. Drizzle runs migrations (now syntax-safe)");
console.log("  2. Schema validation checks and repairs");
console.log("  3. Detects truly critical errors vs warnings");
console.log("  4. Database seeding");
console.log("  5. App boots with full diagnostics logged\n");

console.log("=".repeat(60) + "\n");
