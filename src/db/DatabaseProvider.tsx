import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { type PropsWithChildren, useEffect, useState } from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { db } from "./client";
import { DatabaseDevtools } from "./DatabaseDevtools";
import migrations from "./migrations/migrations";
import { seedDatabase } from "./services/seed.service";

export function DatabaseProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const { success, error } = useMigrations(db, migrations);
  const [isSeedReady, setIsSeedReady] = useState(false);

  useEffect(() => {
    if (!success) {
      return;
    }

    let isMounted = true;

    void (async () => {
      await seedDatabase();

      if (isMounted) {
        setIsSeedReady(true);
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

  if (!success || !isSeedReady) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Preparing your local finance database...
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
