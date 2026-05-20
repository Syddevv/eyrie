import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { InteractionManager } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "./client";
import { DatabaseDevtools } from "./DatabaseDevtools";
import migrations from "./migrations/migrations";
import {
  getMigrationVersionSnapshot,
  validateAndRepairLocalSchema,
} from "./schema-validation";
import { seedDatabase } from "./services/seed.service";
import { accountsService } from "./services/accountsService";

type DatabaseBootstrapState = {
  isReady: boolean;
  error: Error | null;
};

const DatabaseBootstrapContext = createContext<DatabaseBootstrapState>({
  isReady: false,
  error: null,
});

export function useDatabaseBootstrap() {
  return useContext(DatabaseBootstrapContext);
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);
  const [bootState, setBootState] = useState<{
    phase: "migrating" | "validating" | "seeding" | "ready" | "error";
    message: string;
  }>({
    phase: "migrating",
    message: "Preparing your local finance database...",
  });

  useEffect(() => {
    if (!success) {
      if (error) {
        console.error("[db:boot] Migration failed:", error.message);
      }
      return;
    }

    let isMounted = true;
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | null =
      null;

    interactionTask = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          // Phase 1: Log migration status
          setBootState({
            phase: "validating",
            message: "Validating your local finance database...",
          });

          const migrationSnapshot = await getMigrationVersionSnapshot();
          console.log("[db:boot] Migration snapshot:", {
            hasMigrationTable: migrationSnapshot.hasMigrationTable,
            appliedCount: migrationSnapshot.appliedMigrations?.length || 0,
            migrations: migrationSnapshot.appliedMigrations
              ?.map((m: any) => m.hash || m.id)
              .slice(-3),
          });

          // Phase 2: Validate and repair schema
          const validation = await validateAndRepairLocalSchema();

          console.log("[db:boot] Schema validation complete:", {
            repaired: validation.repaired,
            skipped: validation.skipped,
            unrecoverable: validation.unrecoverable,
            errorCount: validation.errors?.length || 0,
          });

          if (validation.errors?.length) {
            console.log(
              "[db:boot] Validation errors:",
              validation.errors.map((e) => `${e.table}.${e.column}: ${e.error}`),
            );
          }

          const criticalErrors = validation.unrecoverable.filter(
            (err) =>
              err.includes("Missing required table") ||
              err.includes("user_id") ||
              err.includes("updated_at"),
          );

          if (criticalErrors.length > 0) {
            const errorDetails = validation.errors?.length
              ? `\n${validation.errors
                  .filter((e) => e.recoverable === false)
                  .map((e) => `  ${e.table}.${e.column}: ${e.error}`)
                  .join("\n")}`
              : "";

            throw new Error(
              `Critical database schema error: ${criticalErrors.join(
                "; ",
              )}${errorDetails}`,
            );
          }

          if (validation.unrecoverable.length > 0) {
            console.warn("[db:boot] Non-critical schema issues:", {
              issues: validation.unrecoverable,
              repaired: validation.repaired.length,
              skipped: validation.skipped.length,
            });
          }

          // Phase 3: Seed database
          setBootState({
            phase: "seeding",
            message: "Finishing local database setup...",
          });

          await seedDatabase();

          const cleanupResult =
            await accountsService.cleanupDuplicateCashAccounts();
          if (cleanupResult.removed > 0) {
            console.log(
              `[db:boot] Cleanup removed ${cleanupResult.removed} duplicate CASH accounts`,
            );
          }

          if (isMounted) {
            console.log("[db:boot] Database boot complete");
            setBootState({
              phase: "ready",
              message: "Local finance database is ready.",
            });
          }
        } catch (bootError) {
          if (!isMounted) {
            return;
          }

          const message =
            bootError instanceof Error ? bootError.message : String(bootError);

          console.error("[db:boot] Boot error:", {
            message,
            stack: bootError instanceof Error ? bootError.stack : undefined,
          });

          setBootState({
            phase: "error",
            message,
          });
        }
      })();
    });

    return () => {
      isMounted = false;
      interactionTask?.cancel();
    };
  }, [error, success]);

  const contextValue = useMemo<DatabaseBootstrapState>(
    () => ({
      isReady: success && bootState.phase === "ready" && !error,
      error:
        error ??
        (bootState.phase === "error"
          ? new Error(bootState.message)
          : null),
    }),
    [bootState.message, bootState.phase, error, success],
  );

  return (
    <DatabaseBootstrapContext.Provider value={contextValue}>
      {__DEV__ ? <DatabaseDevtools /> : null}
      {children}
    </DatabaseBootstrapContext.Provider>
  );
}
