import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { type PropsWithChildren, useEffect, useState } from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { db } from "./client";
import { DatabaseDevtools } from "./DatabaseDevtools";
import migrations from "./migrations/migrations";
import {
  getMigrationVersionSnapshot,
  validateAndRepairLocalSchema,
} from "./schema-validation";
import { seedDatabase } from "./services/seed.service";
import { accountsService } from "./services/accountsService";

export function DatabaseProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
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
            .slice(-3), // Last 3
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

        // Check for critical errors
        // Only fail if we have unrecoverable issues that truly block operation
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

        // Non-critical warnings are OK
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

        // Phase 3b: Clean up any duplicate CASH accounts from previous app versions
        const cleanupResult =
          await accountsService.cleanupDuplicateCashAccounts();
        if (cleanupResult.removed > 0) {
          console.log(
            `[db:boot] Cleanup removed ${cleanupResult.removed} duplicate CASH accounts`,
          );
        }

        // Phase 4: Ready
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

    return () => {
      isMounted = false;
    };
  }, [success]);

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.destructive }]}>
          Database migration failed: {error.message}
        </Text>
      </View>
    );
  }

  if (bootState.phase === "error") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.destructive }]}>
          {bootState.message}
        </Text>
      </View>
    );
  }

  if (!success || bootState.phase !== "ready") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {bootState.message}
        </Text>
      </View>
    );
  }

  return (
    <>
      {__DEV__ ? <DatabaseDevtools /> : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
