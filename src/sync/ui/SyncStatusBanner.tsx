import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themeColors } from "@/constants/colors";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useManualSync, useSyncStatus } from "../hooks";

function formatLastSynced(lastSyncedAt: string | null) {
  if (!lastSyncedAt) {
    return "Not synced yet";
  }

  const date = new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SyncStatusBanner() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    lastError,
    uiState,
    isRestoring,
  } = useSyncStatus();
  const { syncNow } = useManualSync();

  if (uiState === "idle" && isOnline && !pendingCount && !lastError) {
    return null;
  }

  const tone =
    uiState === "schema_error" || uiState === "failed"
      ? "warning"
      : uiState === "offline"
        ? "offline"
        : "info";

  const backgroundColor =
    tone === "warning"
      ? colorScheme === "dark"
        ? "#2A1C0B"
        : "#FFF7E6"
      : tone === "offline"
        ? colorScheme === "dark"
          ? "#102131"
          : "#EAF5FF"
        : colorScheme === "dark"
          ? "#082131"
          : "#E7F4FF";

  const accentColor =
    tone === "warning" ? "#F59E0B" : tone === "offline" ? "#60A5FA" : colors.primary;

  const title = isRestoring
    ? "Restoring your data"
    : uiState === "offline"
      ? "Offline mode"
      : uiState === "retrying"
        ? "Retrying sync soon"
        : uiState === "schema_error"
          ? "Database needs attention"
          : uiState === "failed"
            ? "Sync needs attention"
            : isSyncing
              ? "Syncing your data"
              : "Changes waiting to sync";

  const subtitle = isRestoring
    ? "Downloading your latest finance data before showing the app."
    : uiState === "offline"
      ? "Changes will sync automatically when your connection returns."
      : uiState === "retrying"
        ? "Some changes are queued and will retry in the background."
        : uiState === "schema_error"
          ? lastError ?? "A local database schema repair is required."
          : uiState === "failed"
            ? lastError ?? "Sync needs manual attention."
            : `Last synced ${formatLastSynced(lastSyncedAt)}${pendingCount ? ` • ${pendingCount} pending` : ""}`;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
      <View style={[styles.banner, { backgroundColor, borderColor: accentColor }]}>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        </View>

        {uiState === "schema_error" || uiState === "failed" || uiState === "retrying" ? (
          <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={() => void syncNow()}>
            <Text style={styles.buttonText}>{isSyncing ? "..." : "Retry"}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    minWidth: 58,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
  },
});
