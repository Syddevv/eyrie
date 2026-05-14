# Database Migration System - Expo SQLite Compatible

## Architecture Overview

The database boot and migration system now uses a three-phase approach optimized for Expo SQLite compatibility:

```
Phase 1: Drizzle Migrations (Syntax-Safe)
   └─ Run all .sql files without IF NOT EXISTS
   └─ Migrations must be idempotent through design
   └─ No reliance on unsupported SQLite syntax

Phase 2: Schema Validation & Repair (Safe Column Addition)
   └─ Check current schema with PRAGMA table_info
   └─ Detect missing columns
   └─ Add columns without IF NOT EXISTS
   └─ Verify columns were added
   └─ Comprehensive error logging

Phase 3: Database Seeding
   └─ Populate initial data
   └─ Only runs if schema is valid
```

## Key Design Principles

### 1. No IF NOT EXISTS in Migration SQL

- **Why**: Expo SQLite doesn't reliably support `ADD COLUMN IF NOT EXISTS`
- **Solution**: Pre-check column existence, only run ALTER if needed
- **Files affected**: All files in `src/db/migrations/*.sql`

### 2. Pre-checks Before ALTER

Schema validation layer uses `PRAGMA table_info()` to:

- Get current table structure
- Check if column already exists
- Only execute ALTER TABLE if necessary
- Verify column was added after execution

### 3. Graceful Error Handling

- Distinguish between critical and non-critical errors
- Don't crash app for non-critical schema issues
- Log detailed diagnostics for debugging
- Allow partial operation if needed

### 4. Table Name Consistency

- All tables use **plural names**: `accounts`, `users`, `categories`, etc.
- Drizzle schema defines: `sqliteTable("accounts", { ... })`
- All SQL references use backticks and correct names
- Validated across schema, migrations, and validators

## Migration Files

### Safe Migration Pattern

❌ **DO NOT USE** (Expo SQLite incompatible):

```sql
ALTER TABLE `accounts` ADD COLUMN IF NOT EXISTS `account_holder_name` TEXT;
```

✅ **USE INSTEAD** (Pre-check in validation layer):

```sql
ALTER TABLE `accounts` ADD COLUMN `account_holder_name` TEXT;
```

The schema validation layer handles the pre-check:

```typescript
if (columns.has("account_holder_name")) {
  return; // Column exists, skip
}
// Column missing, run ALTER (safe because pre-checked)
await expoDb.execAsync(
  "ALTER TABLE accounts ADD COLUMN account_holder_name TEXT;",
);
```

## Current Migration Files Status

| File                            | Columns             | Status | Expo Safe |
| ------------------------------- | ------------------- | ------ | --------- |
| 0000_chunky_hitman.sql          | Initial tables      | Active | ✓ Yes     |
| 0001_next_bloodstrike.sql       | Core schema         | Active | ✓ Yes     |
| 0002_fancy_category_control.sql | 7 columns           | Active | ✓ Yes     |
| 0003_goals_rebuild.sql          | Savings goals       | Active | ✓ Yes     |
| 0004_merchants_refactor.sql     | Merchants table     | Active | ✓ Yes     |
| 0005_sync_foundation.sql        | 40+ columns         | Active | ✓ Yes     |
| 0006_accounts_holder_name.sql   | account_holder_name | Active | ✓ Yes     |

All migration files have been verified to be Expo SQLite compatible (no IF NOT EXISTS).

## Schema Validation Layer

### Location

`src/db/schema-validation.ts`

### Key Functions

#### `validateAndRepairLocalSchema()`

```typescript
// Returns:
{
  repaired: string[];      // Columns that were added
  skipped: string[];       // Columns that already existed
  unrecoverable: string[]; // Critical errors
  errors: Array<{
    table: string;
    column: string;
    error: string;
    recoverable: boolean;
  }>;
}
```

### Column Specs

Defined in `SCHEMA_SPECS` with tables:

- `accounts` - 5 recoverable columns
- `users` - 4 recoverable columns
- `goal_contributions` - 4 recoverable columns

Each column spec includes:

```typescript
{
  name: "account_holder_name",
  sql: "ALTER TABLE accounts ADD COLUMN account_holder_name TEXT;",
  recoverable: true  // Can fail without blocking app
}
```

## Boot Provider

### Location

`src/db/DatabaseProvider.tsx`

### Boot Flow with Logging

```
[db:boot] Boot started
  └─ useMigrations completes ✓
  └─ getMigrationVersionSnapshot()
     └─ [db:boot] Migration snapshot: {hasMigrationTable, appliedCount}
  └─ validateAndRepairLocalSchema()
     └─ [db:schema] Starting schema validation...
     └─ [db:schema] Checking table: accounts
     └─ [db:schema] ✓ Table exists: accounts
     └─ [db:schema] → Adding column: accounts.account_holder_name
     └─ [db:schema] ✓ Successfully added column
  └─ Check for critical errors
     └─ Missing required tables → CRITICAL FAIL
     └─ Missing user_id column → CRITICAL FAIL
     └─ Missing other columns → LOG WARNING (continue)
  └─ seedDatabase() ✓
  └─ [db:boot] Database boot complete ✓
```

### Error Handling

**Critical Errors** (fail app):

- Missing required tables (accounts, users, etc.)
- Missing non-recoverable columns (user_id, updated_at)

**Non-Critical Errors** (logged as warnings):

- Missing optional sync columns
- Already-added columns (duplicate detection)

## Testing Boot Flows

### Fresh Install

```
Expected:
  1. All migrations run
  2. Schema validation adds all missing columns
  3. Database seeded
  4. App boots successfully

Test:
  npm start
  → Check console for [db:boot] logs
  → Verify app shows main screen
```

### Reinstall (Reset + Launch)

```
Expected:
  1. Same as fresh install
  2. Columns already exist (skipped)
  3. No errors about "already exists"
  4. App boots successfully

Test:
  Delete app data / reinstall
  → Check schema validation skips existing columns
  → Verify no column-exists errors
```

### Upgrade (New Migration)

```
Expected:
  1. New migrations run first
  2. Schema validation repairs any gaps
  3. No errors from existing columns
  4. App boots with new columns available

Test:
  Update to new version with migrations
  → Run npm start
  → Check logs for specific migration
```

### Offline Startup

```
Expected:
  1. Drizzle migrations skip (no remote)
  2. Schema validation uses local DB
  3. Local data loads
  4. Sync queued for when online

Test:
  Disable network
  → Force app restart
  → Check offline functionality works
```

### Login Restore & Sync Reconnect

```
Expected:
  1. Cached session persists
  2. Local DB accessible
  3. Sync queue processes when online
  4. No migration conflicts

Test:
  Kill app, stay offline
  → Restart app
  → Go online
  → Verify sync continues
```

## Debugging Migration Issues

### Enable Detailed Logging

All migration logs use `[db:boot]` and `[db:schema]` prefixes:

```typescript
// View in console:
[db:boot] Migration snapshot: {...}
[db:schema] Starting schema validation...
[db:schema] Checking table: accounts
[db:schema] → Adding column: accounts.account_holder_name
[db:schema] ✓ Successfully added column: accounts.account_holder_name
```

### Common Issues & Solutions

#### ❌ Error: "column already exists"

**Cause**: Concurrent modifications or cached columns check  
**Solution**: Schema validation now detects this and skips gracefully

#### ❌ Error: "table accounts not found"

**Cause**: Drizzle migrations didn't run or failed  
**Solution**: Check initial migration (0000) ran successfully

#### ❌ Error: "ADD COLUMN IF NOT EXISTS not supported"

**Cause**: IF NOT EXISTS present in SQL (legacy issue)  
**Solution**: Remove IF NOT EXISTS - schema validation pre-checks existence

#### ❌ Error: "PRAGMA table_info() returned empty"

**Cause**: Schema validation ran before migrations  
**Solution**: This shouldn't happen - migrations run first

### Diagnostics Script

Run comprehensive checks:

```bash
node scripts/diagnose-db-boot.js
```

Verifies:

- ✓ No IF NOT EXISTS in migration files
- ✓ Schema validation has proper error handling
- ✓ Boot provider logs migration progress
- ✓ Table names are consistent
- ✓ All critical components present

## Migration Best Practices

### When Adding a New Column

1. **Update Drizzle schema** (`src/db/schema/[table].ts`):

   ```typescript
   newColumn: text("new_column"),
   ```

2. **Add to SCHEMA_SPECS** (`src/db/schema-validation.ts`):

   ```typescript
   {
     name: "new_column",
     sql: "ALTER TABLE table_name ADD COLUMN new_column TEXT;",
     recoverable: true,
   }
   ```

3. **Run migration generation**:

   ```bash
   npm run db:generate
   ```

4. **Verify NO IF NOT EXISTS** in generated `.sql` file

5. **Test boot flows** (fresh, reinstall, upgrade, offline)

### When Adding a New Table

1. Create Drizzle table definition
2. Run `npm run db:generate`
3. New table appears in migrations automatically
4. No manual schema-validation entry needed (validation only handles columns)

## Future Improvements

### Optional Enhancements

- Automatic schema upgrade wizard for users
- Schema version tracking in app settings
- Database integrity checker pre-boot
- Migration rollback for failed upgrades
- Automated backup before risky migrations

### Anti-Patterns to Avoid

- ❌ Using IF NOT EXISTS in .sql files
- ❌ Hardcoding table names with wrong pluralization
- ❌ Silent failures in schema validation
- ❌ Not logging migration steps
- ❌ Infinite repair loops
- ❌ Blocking app on non-critical schema errors

## Summary

**The migration system is now:**

- ✅ Expo SQLite compatible (no IF NOT EXISTS)
- ✅ Deterministic (no race conditions)
- ✅ Safe (pre-checks before ALTER)
- ✅ Logged (detailed diagnostics)
- ✅ Resilient (graceful error handling)
- ✅ Consistent (unified table naming)
- ✅ Testable (comprehensive validation)

**Expected behavior across all flows:**

- Fresh install → Boot successfully, log migrations
- Reinstall → Boot successfully, skip existing columns
- Upgrade → Boot successfully, apply new migrations
- Offline → Boot locally with cached data
- Sync restore → Reconnect and resume syncing
