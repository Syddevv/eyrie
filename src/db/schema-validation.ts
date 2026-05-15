import { expoDb } from "./client";

type ColumnSpec = {
  name: string;
  sql: string;
  recoverable: boolean;
};

type TableSpec = {
  table: string;
  columns: ColumnSpec[];
};

type SqliteTableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

const SCHEMA_SPECS: TableSpec[] = [
  {
    table: "accounts",
    columns: [
      {
        name: "account_holder_name",
        sql: "ALTER TABLE accounts ADD COLUMN account_holder_name TEXT;",
        recoverable: true,
      },
      {
        name: "deleted_at",
        sql: "ALTER TABLE accounts ADD COLUMN deleted_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_status",
        sql: "ALTER TABLE accounts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';",
        recoverable: true,
      },
      {
        name: "last_synced_at",
        sql: "ALTER TABLE accounts ADD COLUMN last_synced_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_error",
        sql: "ALTER TABLE accounts ADD COLUMN sync_error TEXT;",
        recoverable: true,
      },
    ],
  },
  {
    table: "users",
    columns: [
      {
        name: "deleted_at",
        sql: "ALTER TABLE users ADD COLUMN deleted_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_status",
        sql: "ALTER TABLE users ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';",
        recoverable: true,
      },
      {
        name: "last_synced_at",
        sql: "ALTER TABLE users ADD COLUMN last_synced_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_error",
        sql: "ALTER TABLE users ADD COLUMN sync_error TEXT;",
        recoverable: true,
      },
    ],
  },
  {
    table: "goal_contributions",
    columns: [
      { name: "user_id", sql: "", recoverable: false },
      { name: "updated_at", sql: "", recoverable: false },
      {
        name: "deleted_at",
        sql: "ALTER TABLE goal_contributions ADD COLUMN deleted_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_status",
        sql: "ALTER TABLE goal_contributions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';",
        recoverable: true,
      },
      {
        name: "last_synced_at",
        sql: "ALTER TABLE goal_contributions ADD COLUMN last_synced_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_error",
        sql: "ALTER TABLE goal_contributions ADD COLUMN sync_error TEXT;",
        recoverable: true,
      },
    ],
  },
  {
    table: "notifications",
    columns: [
      {
        name: "type",
        sql: "ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'reminder';",
        recoverable: true,
      },
      {
        name: "data",
        sql: "ALTER TABLE notifications ADD COLUMN data TEXT;",
        recoverable: true,
      },
      {
        name: "action_url",
        sql: "ALTER TABLE notifications ADD COLUMN action_url TEXT;",
        recoverable: true,
      },
      {
        name: "category",
        sql: "ALTER TABLE notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'reminders';",
        recoverable: true,
      },
      {
        name: "priority",
        sql: "ALTER TABLE notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';",
        recoverable: true,
      },
      {
        name: "icon",
        sql: "ALTER TABLE notifications ADD COLUMN icon TEXT NOT NULL DEFAULT 'bell';",
        recoverable: true,
      },
      {
        name: "color",
        sql: "ALTER TABLE notifications ADD COLUMN color TEXT NOT NULL DEFAULT '#6366F1';",
        recoverable: true,
      },
      {
        name: "dedupe_key",
        sql: "ALTER TABLE notifications ADD COLUMN dedupe_key TEXT NOT NULL DEFAULT '';",
        recoverable: true,
      },
      {
        name: "read_at",
        sql: "ALTER TABLE notifications ADD COLUMN read_at TEXT;",
        recoverable: true,
      },
      {
        name: "scheduled_for",
        sql: "ALTER TABLE notifications ADD COLUMN scheduled_for TEXT;",
        recoverable: true,
      },
      {
        name: "delivered_at",
        sql: "ALTER TABLE notifications ADD COLUMN delivered_at TEXT;",
        recoverable: true,
      },
      {
        name: "delivery_state",
        sql: "ALTER TABLE notifications ADD COLUMN delivery_state TEXT NOT NULL DEFAULT 'delivered';",
        recoverable: true,
      },
      {
        name: "local_schedule_id",
        sql: "ALTER TABLE notifications ADD COLUMN local_schedule_id TEXT;",
        recoverable: true,
      },
      {
        name: "updated_at",
        sql: "ALTER TABLE notifications ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';",
        recoverable: true,
      },
      {
        name: "deleted_at",
        sql: "ALTER TABLE notifications ADD COLUMN deleted_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_status",
        sql: "ALTER TABLE notifications ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';",
        recoverable: true,
      },
      {
        name: "last_synced_at",
        sql: "ALTER TABLE notifications ADD COLUMN last_synced_at TEXT;",
        recoverable: true,
      },
      {
        name: "sync_error",
        sql: "ALTER TABLE notifications ADD COLUMN sync_error TEXT;",
        recoverable: true,
      },
    ],
  },
];

async function getTableColumns(table: string) {
  const rows = (await expoDb.getAllAsync(
    `PRAGMA table_info(${table});`,
  )) as SqliteTableInfoRow[];
  return new Set(rows.map((row) => row.name));
}

async function tableExists(table: string) {
  const rows = (await expoDb.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;",
    [table],
  )) as Array<{ name: string }>;
  return rows.length > 0;
}

export async function getMigrationVersionSnapshot() {
  const hasMigrationTable = await tableExists("__drizzle_migrations");
  if (!hasMigrationTable) {
    return {
      hasMigrationTable: false,
      appliedMigrations: [],
    };
  }

  const rows = await expoDb.getAllAsync(
    "SELECT * FROM __drizzle_migrations ORDER BY rowid ASC;",
  );

  return {
    hasMigrationTable: true,
    appliedMigrations: rows,
  };
}

export async function validateAndRepairLocalSchema() {
  const repaired: string[] = [];
  const skipped: string[] = [];
  const unrecoverable: string[] = [];
  const errors: Array<{
    column: string;
    table: string;
    error: string;
    recoverable: boolean;
  }> = [];

  console.log("[db:schema] Starting schema validation and repair...");

  for (const spec of SCHEMA_SPECS) {
    console.log(`[db:schema] Checking table: ${spec.table}`);

    if (!(await tableExists(spec.table))) {
      const msg = `Missing required table: ${spec.table}`;
      console.error(`[db:schema] ✗ ${msg}`);
      unrecoverable.push(msg);
      continue;
    }

    console.log(`[db:schema] ✓ Table exists: ${spec.table}`);

    const columns = await getTableColumns(spec.table);
    console.log(
      `[db:schema] Found ${columns.size} columns in ${spec.table}: ${Array.from(columns).join(", ")}`,
    );

    for (const column of spec.columns) {
      if (columns.has(column.name)) {
        console.log(
          `[db:schema] ⊙ Column already exists: ${spec.table}.${column.name}`,
        );
        skipped.push(`${spec.table}.${column.name}`);
        continue;
      }

      if (!column.recoverable || !column.sql) {
        const msg = `Missing non-recoverable column ${spec.table}.${column.name}`;
        console.error(`[db:schema] ✗ ${msg}`);
        unrecoverable.push(msg);
        errors.push({
          table: spec.table,
          column: column.name,
          error: msg,
          recoverable: false,
        });
        continue;
      }

      // Column is missing and should be added
      try {
        console.log(
          `[db:schema] → Adding column: ${spec.table}.${column.name}`,
        );
        console.log(`[db:schema]   SQL: ${column.sql}`);

        await expoDb.execAsync(column.sql);

        // Verify column was actually added
        const updatedColumns = await getTableColumns(spec.table);
        if (updatedColumns.has(column.name)) {
          console.log(
            `[db:schema] ✓ Successfully added column: ${spec.table}.${column.name}`,
          );
          repaired.push(`${spec.table}.${column.name}`);
        } else {
          // Migration ran but column wasn't added - this is a serious issue
          const msg = `Column ${spec.table}.${column.name} was not added despite successful SQL execution`;
          console.error(`[db:schema] ✗ ${msg}`);
          unrecoverable.push(msg);
          errors.push({
            table: spec.table,
            column: column.name,
            error: msg,
            recoverable: false,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[db:schema] ✗ Failed to add column ${spec.table}.${column.name}:`,
          errorMessage,
        );

        // Check if this is a column-already-exists error (can happen if concurrent operations)
        if (
          errorMessage.includes("duplicate column") ||
          errorMessage.includes("already exists")
        ) {
          // This is actually OK - column exists but we didn't see it in our check
          console.log(
            `[db:schema] ⊙ Column ${spec.table}.${column.name} exists (concurrent add detected)`,
          );
          skipped.push(`${spec.table}.${column.name}`);
          continue;
        }

        // Other errors are unrecoverable
        errors.push({
          table: spec.table,
          column: column.name,
          error: errorMessage,
          recoverable: false,
        });

        unrecoverable.push(
          `Failed to add column ${spec.table}.${column.name}: ${errorMessage}`,
        );
      }
    }
  }

  console.log("[db:schema] Schema validation complete", {
    repaired: repaired.length,
    skipped: skipped.length,
    unrecoverable: unrecoverable.length,
  });

  return {
    repaired,
    skipped,
    unrecoverable,
    errors,
  };
}
