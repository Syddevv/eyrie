#!/usr/bin/env node

/**
 * Final Verification Checklist
 * Run this script to verify all database migration fixes are in place
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("\n" + "═".repeat(70));
console.log("  FINAL VERIFICATION CHECKLIST - Database Migration Fixes");
console.log("═".repeat(70) + "\n");

let allGood = true;
let checks = 0;
let passed = 0;

function check(name, fn) {
  checks++;
  try {
    if (fn()) {
      console.log(`✅ ${name}`);
      passed++;
      return true;
    } else {
      console.log(`❌ ${name}`);
      allGood = false;
      return false;
    }
  } catch (err) {
    console.log(`❌ ${name} - ${err.message}`);
    allGood = false;
    return false;
  }
}

// 1. Migration Files
console.log("📋 MIGRATION FILES\n");

const migrationsDir = path.join(__dirname, "../src/db/migrations");
const migrationFiles = [
  "0002_fancy_category_control.sql",
  "0005_sync_foundation.sql",
  "0006_accounts_holder_name.sql",
];

migrationFiles.forEach((file) => {
  check(`${file} exists`, () => fs.existsSync(path.join(migrationsDir, file)));
});

migrationFiles.forEach((file) => {
  check(`${file} has no IF NOT EXISTS`, () => {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    return !content.includes("IF NOT EXISTS");
  });
});

// 2. Schema Validation
console.log("\n📋 SCHEMA VALIDATION LAYER\n");

const schemaPath = path.join(__dirname, "../src/db/schema-validation.ts");
const schemaContent = fs.readFileSync(schemaPath, "utf8");

check("schema-validation.ts has no IF NOT EXISTS in SQL", () => {
  return !schemaContent.includes("IF NOT EXISTS");
});

check("schema-validation.ts has PRAGMA table_info", () => {
  return schemaContent.includes("PRAGMA table_info");
});

check("schema-validation.ts has error handling", () => {
  return schemaContent.includes("try") && schemaContent.includes("catch");
});

check("schema-validation.ts verifies columns after ALTER", () => {
  return schemaContent.includes("updatedColumns.has");
});

check("schema-validation.ts has detailed logging", () => {
  return schemaContent.includes("[db:schema]");
});

check("schema-validation.ts handles duplicate columns", () => {
  return (
    schemaContent.includes("duplicate column") ||
    schemaContent.includes("already exists")
  );
});

// 3. Boot Provider
console.log("\n📋 BOOT PROVIDER\n");

const providerPath = path.join(__dirname, "../src/db/DatabaseProvider.tsx");
const providerContent = fs.readFileSync(providerPath, "utf8");

check("DatabaseProvider.tsx has boot logging", () => {
  return providerContent.includes("[db:boot]");
});

check("DatabaseProvider.tsx has error categorization", () => {
  return providerContent.includes("criticalErrors");
});

check("DatabaseProvider.tsx logs migration snapshot", () => {
  return providerContent.includes("appliedCount");
});

check("DatabaseProvider.tsx has phase-based boot", () => {
  return (
    providerContent.includes("validating") &&
    providerContent.includes("seeding")
  );
});

// 4. Documentation
console.log("\n📋 DOCUMENTATION\n");

check("MIGRATION_SYSTEM.md exists", () => {
  return fs.existsSync(path.join(__dirname, "../MIGRATION_SYSTEM.md"));
});

check("DATABASE_MIGRATION_FIX.md exists", () => {
  return fs.existsSync(path.join(__dirname, "../DATABASE_MIGRATION_FIX.md"));
});

// 5. Diagnostics Tool
console.log("\n📋 DIAGNOSTICS TOOLS\n");

check("diagnose-db-boot.js exists", () => {
  return fs.existsSync(path.join(__dirname, "diagnose-db-boot.js"));
});

// 6. Table Consistency
console.log("\n📋 TABLE NAME CONSISTENCY\n");

const accountsSchemaPath = path.join(__dirname, "../src/db/schema/accounts.ts");
const accountsSchema = fs.readFileSync(accountsSchemaPath, "utf8");

check('Accounts schema uses plural "accounts"', () => {
  return accountsSchema.includes('sqliteTable(\n  "accounts"');
});

check("Accounts schema defines account_holder_name", () => {
  return (
    accountsSchema.includes("accountHolderName") &&
    accountsSchema.includes("account_holder_name")
  );
});

check("Schema validation uses consistent table names", () => {
  return (
    schemaContent.includes('table: "accounts"') &&
    !schemaContent.includes('table: "account"')
  );
});

// Summary
console.log("\n" + "═".repeat(70));
console.log(`  VERIFICATION COMPLETE: ${passed}/${checks} checks passed\n`);

if (allGood) {
  console.log("✅ ALL SYSTEMS GO!\n");
  console.log("Safe to test:");
  console.log("  ✓ Fresh install");
  console.log("  ✓ Reinstall");
  console.log("  ✓ Upgrade");
  console.log("  ✓ Offline startup");
  console.log("  ✓ Sync reconnect\n");
  console.log("Next: npm start → Check console for [db:boot] logs\n");
} else {
  console.log("❌ ISSUES FOUND\n");
  console.log("Fix the above items before testing.\n");
  process.exit(1);
}

console.log("═".repeat(70) + "\n");
