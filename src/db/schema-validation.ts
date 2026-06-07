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
        name: "is_default",
        sql: "ALTER TABLE accounts ADD COLUMN is_default INTEGER NOT NULL DEFAULT false;",
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
      {
        name: "current_streak",
        sql: "ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;",
        recoverable: true,
      },
      {
        name: "last_active_date",
        sql: "ALTER TABLE users ADD COLUMN last_active_date TEXT;",
        recoverable: true,
      },
      {
        name: "longest_streak",
        sql: "ALTER TABLE users ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;",
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
    table: "transactions",
    columns: [
      {
        name: "source",
        sql: "ALTER TABLE transactions ADD COLUMN source TEXT;",
        recoverable: true,
      },
      {
        name: "reference_type",
        sql: "ALTER TABLE transactions ADD COLUMN reference_type TEXT;",
        recoverable: true,
      },
      {
        name: "reference_id",
        sql: "ALTER TABLE transactions ADD COLUMN reference_id TEXT;",
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

async function ensureTransactionsReferenceIndex() {
  await expoDb.execAsync(
    "CREATE INDEX IF NOT EXISTS transactions_reference_idx ON transactions (source, reference_type, reference_id);",
  );
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

        console.error(
          `[db:schema] ✗ Failed to add column ${spec.table}.${column.name}:`,
          errorMessage,
        );

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

    if (spec.table === "transactions") {
      const updatedColumns = await getTableColumns(spec.table);
      if (
        updatedColumns.has("source") &&
        updatedColumns.has("reference_type") &&
        updatedColumns.has("reference_id")
      ) {
        await ensureTransactionsReferenceIndex();
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
