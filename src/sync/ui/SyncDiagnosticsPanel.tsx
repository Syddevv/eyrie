import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { themeColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/useAuthStore";
import { getMigrationVersionSnapshot } from "@/src/db/schema-validation";
import {
  forceFullResync,
  getSyncDiagnostics,
  retrySyncQueue,
  runSync,
} from "../engine";
import { clearFailedQueue } from "../queue";

interface SyncDiagnosticsPanelProps {
  /**
   * When true, displays as an expandable section (for Settings screen)
   * When false, displays as a floating FAB button (default)
   */
  embedded?: boolean;
}

export function SyncDiagnosticsPanel({
  embedded = false,
}: SyncDiagnosticsPanelProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      return;
    }

    void (async () => {
      const [syncSnapshot, migrationSnapshot] = await Promise.all([
        getSyncDiagnostics(userId),
        getMigrationVersionSnapshot(),
      ]);
      setSnapshot({
        sync: syncSnapshot,
        migrations: migrationSnapshot,
      });
    })();
  }, [isOpen, userId]);

  if (!__DEV__ || !userId) {
    return null;
  }

  const renderContent = (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>
        Sync Diagnostics
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        Queue: {snapshot?.sync?.pendingCount ?? 0} pending • Failed:{" "}
        {snapshot?.sync?.failedCount ?? 0}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        UI: {snapshot?.sync?.store?.uiState ?? "idle"} • Online:{" "}
        {String(snapshot?.sync?.store?.isOnline ?? true)}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        Migrations: {snapshot?.migrations?.appliedMigrations?.length ?? 0}
      </Text>

      {snapshot?.sync?.queueIssues?.length ? (
        <View style={styles.issueList}>
          <Text style={[styles.issueHeading, { color: colors.foreground }]}>
            Queue Issues
          </Text>
          {snapshot.sync.queueIssues.slice(0, 5).map((item: any) => (
            <View key={`${item.tableName}:${item.recordId}`} style={styles.issueItem}>
              <Text style={[styles.issueTitle, { color: colors.foreground }]}>
                {item.tableName} • {item.recordId}
              </Text>
              <Text style={[styles.issueMeta, { color: colors.mutedForeground }]}>
                {item.operation} • attempts {item.attemptCount}
              </Text>
              {item.lastError ? (
                <Text style={[styles.issueError, { color: "#EF4444" }]}>
                  {item.lastError}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {snapshot?.sync?.failedRecords?.length ? (
        <View style={styles.issueList}>
          <Text style={[styles.issueHeading, { color: colors.foreground }]}>
            Failed Records
          </Text>
          {snapshot.sync.failedRecords.slice(0, 5).map((item: any) => (
            <View key={`${item.tableName}:${item.recordId}:failed`} style={styles.issueItem}>
              <Text style={[styles.issueTitle, { color: colors.foreground }]}>
                {item.tableName} • {item.recordId}
              </Text>
              <Text style={[styles.issueMeta, { color: colors.mutedForeground }]}>
                {item.syncStatus ?? "unknown"}
                {item.deletedAt ? " • soft-deleted" : ""}
              </Text>
              {item.syncError ? (
                <Text style={[styles.issueError, { color: "#EF4444" }]}>
                  {item.syncError}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={async () => {
            await retrySyncQueue(userId);
            await runSync({ userId, reason: "manual", force: true });
          }}
        >
          <Text style={styles.actionText}>Retry Queue</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: "#F59E0B" }]}
          onPress={async () => {
            await forceFullResync(userId);
            await runSync({ userId, reason: "manual", force: true });
          }}
        >
          <Text style={styles.actionText}>Full Resync</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: "#EF4444" }]}
          onPress={async () => {
            await clearFailedQueue(userId);
            setSnapshot(await getSyncDiagnostics(userId));
          }}
        >
          <Text style={styles.actionText}>Clear Failed</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.logBox}>
        <Text style={[styles.logText, { color: colors.foreground }]}>
          {JSON.stringify(snapshot, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );

  // Embedded mode: display as a regular section (for Settings)
  if (embedded) {
    return (
      <View>
        <Text
          style={[
            styles.embeddedSectionTitle,
            { color: colors.mutedForeground },
          ]}
        >
          Developer
        </Text>
        <View
          style={[
            styles.embeddedSectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            style={styles.embeddedRow}
            onPress={() => setIsOpen((value) => !value)}
          >
            <Text
              style={[styles.embeddedRowTitle, { color: colors.foreground }]}
            >
              Sync Diagnostics
            </Text>
            <Text
              style={[
                styles.embeddedRowIcon,
                { color: colors.mutedForeground },
              ]}
            >
              {isOpen ? "▼" : "▶"}
            </Text>
          </Pressable>
          {isOpen ? renderContent : null}
        </View>
      </View>
    );
  }

  // Floating mode: original FAB design (for floating in app)
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setIsOpen((value) => !value)}
      >
        <Text style={styles.fabText}>Sync</Text>
      </Pressable>

      {isOpen ? renderContent : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 12,
    bottom: 24,
    zIndex: 60,
    alignItems: "flex-end",
  },
  fab: {
    minWidth: 64,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  fabText: {
    color: "#fff",
    fontWeight: "700",
  },
  panel: {
    width: 320,
    maxHeight: 420,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  heading: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  issueList: {
    marginTop: 12,
    gap: 8,
  },
  issueHeading: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  issueItem: {
    gap: 2,
  },
  issueTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  issueMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  issueError: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#fff",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  logBox: {
    marginTop: 12,
  },
  logText: {
    fontSize: 11,
    lineHeight: 15,
  },
  // Embedded styles (for Settings screen)
  embeddedSectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 0,
    paddingHorizontal: 0,
  },
  embeddedSectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  embeddedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  embeddedRowTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
  embeddedRowIcon: {
    fontSize: 12,
    fontWeight: "600",
  },
});
