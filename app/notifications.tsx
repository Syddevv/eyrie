import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pressable as GestureHandlerPressable } from "react-native-gesture-handler";
import Swipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import MerchantLogo from "@/components/merchant-logo";
import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notifications";
import { triggerNavigationHaptic } from "@/src/lib/navigationHaptics";
import { useOfflineState } from "@/src/sync/hooks";
import { useNotificationStore } from "@/store/useNotificationStore";
import { getMerchantLogo } from "@/utils/getMerchantLogo";

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const NotificationRow = memo(
  function NotificationRow({
    item,
    titleColor,
    bodyColor,
    cardStyle,
    unreadDotStyle,
    onPressItem,
    onToggleReadItem,
    onDeleteItem,
    pendingAction,
  }: {
    item: AppNotification;
    titleColor: string;
    bodyColor: string;
    cardStyle: object;
    unreadDotStyle: object;
    onPressItem: (item: AppNotification) => void;
    onToggleReadItem: (item: AppNotification) => Promise<void>;
    onDeleteItem: (item: AppNotification) => Promise<void>;
    pendingAction: "toggleRead" | "delete" | null;
  }) {
    const swipeableRef = useRef<SwipeableMethods | null>(null);
    const [localPendingAction, setLocalPendingAction] = useState<
      "toggleRead" | "delete" | null
    >(null);
    const effectivePendingAction = localPendingAction ?? pendingAction;
    const isBusy = effectivePendingAction !== null;
    const merchantName =
      typeof item.data?.merchantName === "string"
        ? item.data.merchantName
        : null;
    const hasMerchantLogo = Boolean(getMerchantLogo(merchantName));

    useEffect(() => {
      if (!pendingAction) {
        setLocalPendingAction(null);
      }
    }, [pendingAction]);

    const handleToggleRead = async (swipeable: SwipeableMethods) => {
      if (isBusy) {
        return;
      }

      setLocalPendingAction("toggleRead");

      try {
        await onToggleReadItem(item);
      } catch {
        // Optimistic state rollback is handled by the notification hook.
      } finally {
        swipeable.close();
        swipeable.reset();
      }
    };

    const handleDelete = async (swipeable: SwipeableMethods) => {
      if (isBusy) {
        return;
      }

      setLocalPendingAction("delete");

      try {
        await onDeleteItem(item);
      } catch {
        // Optimistic state rollback is handled by the notification hook.
      } finally {
        swipeable.close();
        swipeable.reset();
      }
    };

    const rightAction = (
      _progress: unknown,
      _translation: unknown,
      swipeable: SwipeableMethods,
    ) => (
      <GestureHandlerPressable
        style={[styles.swipeAction, styles.swipeDelete]}
        onPressIn={() => {
          if (!isBusy) {
            setLocalPendingAction("delete");
          }
        }}
        onPress={() => void handleDelete(swipeable)}
      >
        {effectivePendingAction === "delete" ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Feather name="trash-2" size={18} color="#FFFFFF" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </>
        )}
      </GestureHandlerPressable>
    );

    const leftAction = (
      _progress: unknown,
      _translation: unknown,
      swipeable: SwipeableMethods,
    ) => (
      <GestureHandlerPressable
        style={[styles.swipeAction, styles.swipeRead]}
        onPressIn={() => {
          if (!isBusy) {
            setLocalPendingAction("toggleRead");
          }
        }}
        onPress={() => void handleToggleRead(swipeable)}
      >
        {effectivePendingAction === "toggleRead" ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Feather
              name={item.is_read ? "mail" : "check-circle"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.swipeActionText}>
              {item.is_read ? "Mark unread" : "Mark read"}
            </Text>
          </>
        )}
      </GestureHandlerPressable>
    );

    return (
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutUp.duration(180)}
        layout={LinearTransition.springify()}
      >
        <View
          style={[styles.notificationCardContainer, cardStyle, shadows.soft]}
        >
          <Swipeable
            ref={swipeableRef}
            renderLeftActions={leftAction}
            renderRightActions={rightAction}
            overshootLeft={false}
            overshootRight={false}
          >
            <Pressable
              disabled={effectivePendingAction === "delete"}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [
                styles.notificationCardInner,
                pressed &&
                  effectivePendingAction !== "delete" &&
                  styles.notificationCardPressed,
                effectivePendingAction === "delete" &&
                  styles.notificationCardBusy,
              ]}
            >
              <View style={styles.notificationCardContent}>
                <View
                  style={[
                    styles.notificationIconContainer,
                    {
                      backgroundColor: hasMerchantLogo
                        ? "transparent"
                        : withOpacity(item.color, item.is_read ? 0.1 : 0.14),
                      borderColor: hasMerchantLogo
                        ? "transparent"
                        : withOpacity(item.color, item.is_read ? 0.08 : 0.12),
                    },
                  ]}
                >
                  {merchantName ? (
                    <MerchantLogo
                      merchant={merchantName}
                      size={56}
                      fallbackIcon={{
                        library: "feather",
                        name: item.icon,
                        color: item.color,
                      }}
                    />
                  ) : (
                    <Feather
                      name={item.icon as any}
                      size={22}
                      color={item.color}
                    />
                  )}
                </View>

                <View style={styles.contentSection}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        {
                          color: titleColor,
                          fontWeight: item.is_read ? "600" : "700",
                          opacity: item.is_read ? 0.7 : 1,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    {!item.is_read ? (
                      <View style={[styles.unreadIndicator, unreadDotStyle]} />
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.notificationBody,
                      {
                        color: bodyColor,
                        opacity: item.is_read ? 0.6 : 0.8,
                      },
                    ]}
                  >
                    {item.message}
                  </Text>

                  <View style={styles.metadataRow}>
                    <Text
                      style={[styles.notificationTime, { color: bodyColor }]}
                    >
                      {formatRelativeTime(item.created_at)}
                    </Text>
                    <Text
                      style={[
                        styles.notificationCategory,
                        { color: item.color },
                      ]}
                    >
                      {item.category.replace(/^\w/, (char) =>
                        char.toUpperCase(),
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Swipeable>
        </View>
      </Animated.View>
    );
  },
  (previous, next) =>
    previous.item === next.item &&
    previous.pendingAction === next.pendingAction &&
    previous.titleColor === next.titleColor &&
    previous.bodyColor === next.bodyColor &&
    previous.cardStyle === next.cardStyle &&
    previous.unreadDotStyle === next.unreadDotStyle,
);

export default function NotificationsScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<AppNotification> | null>(null);
  const hasRestoredScrollRef = useRef(false);
  const currentScrollOffsetRef = useRef(0);
  const pendingActionsByIdRef = useRef<Record<string, "toggleRead" | "delete">>(
    {},
  );
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { isOffline } = useOfflineState();
  const [isMarkAllPending, setIsMarkAllPending] = useState(false);
  const [pendingActionsById, setPendingActionsById] = useState<
    Record<string, "toggleRead" | "delete">
  >({});
  const { preferences, isLoading: isPreferencesLoading } =
    useNotificationPreferences();
  const notificationsEnabled = preferences?.notifications_enabled ?? false;
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasHydrated,
    hasCachedData,
    error,
    refresh,
    markAllAsRead,
    toggleRead,
    deleteNotification,
  } = useNotifications(notificationsEnabled);
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const setScrollOffsetForUser = useNotificationStore(
    (state) => state.setScrollOffsetForUser,
  );
  const initialScrollOffsetRef = useRef(
    userId
      ? (useNotificationStore.getState().getCacheForUser(userId)
          ?.scrollOffset ?? 0)
      : 0,
  );

  useEffect(() => {
    currentScrollOffsetRef.current = initialScrollOffsetRef.current;
  }, []);

  useEffect(() => {
    pendingActionsByIdRef.current = pendingActionsById;
  }, [pendingActionsById]);

  const persistScrollOffset = useCallback(() => {
    if (!userId) {
      return;
    }

    setScrollOffsetForUser(userId, currentScrollOffsetRef.current);
  }, [setScrollOffsetForUser, userId]);

  const scheduleScrollOffsetPersist = useCallback(() => {
    requestAnimationFrame(() => {
      persistScrollOffset();
    });
  }, [persistScrollOffset]);

  useEffect(() => {
    if (
      !userId ||
      hasRestoredScrollRef.current ||
      initialScrollOffsetRef.current <= 0
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: initialScrollOffsetRef.current,
        animated: false,
      });
      hasRestoredScrollRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [userId]);

  useEffect(() => {
    return () => {
      scheduleScrollOffsetPersist();
    };
  }, [scheduleScrollOffsetPersist]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const shouldShowBlockingLoadingState =
    notificationsEnabled && isLoading && !hasCachedData && !hasHydrated;

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? "#060B15" : colors.background },
      title: { color: isDark ? "#FFFFFF" : colors.foreground },
      subtitle: { color: isDark ? "#9EA6B5" : "#6B7485" },
      iconButton: {
        backgroundColor: isDark
          ? "#161D29"
          : withOpacity(colors.secondary, 0.9),
      },
      infoCard: {
        backgroundColor: isDark ? "#071B35" : "#EAF5FF",
        borderColor: isDark ? "rgba(20,149,255,0.2)" : "rgba(20,149,255,0.16)",
      },
      infoTitle: { color: isDark ? "#FFFFFF" : "#0D1B2A" },
      infoText: { color: isDark ? "#A5B2C2" : "#5C7694" },
      unreadCard: {
        backgroundColor: isDark ? "#12233B" : "#F8FCFF",
        borderColor: isDark ? "rgba(20,149,255,0.38)" : "rgba(20,149,255,0.26)",
      },
      readCard: {
        backgroundColor: isDark ? "#0F1724" : "#F4F7FB",
        borderColor: isDark
          ? "rgba(255,255,255,0.12)"
          : withOpacity(colors.border, 0.9),
      },
      swipeHintChip: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : withOpacity(colors.secondary, 0.88),
        borderColor: isDark
          ? "rgba(255,255,255,0.08)"
          : withOpacity(colors.border, 0.88),
      },
      swipeHintText: {
        color: isDark ? "#8F9AAF" : "#6B7485",
      },

      titleText: isDark ? "#FFFFFF" : colors.foreground,
      bodyText: isDark ? "#9EA6B5" : "#6B7485",
      unreadDot: { backgroundColor: "#1495FF" },
      emptyCard: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : withOpacity(colors.border, 0.92),
      },
      actionText: { color: isDark ? "#FFFFFF" : colors.foreground },
    }),
    [colors, isDark],
  );

  const handleRefresh = async () => {
    await refresh({ force: true });
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkAllPending || !notificationsEnabled || unreadCount === 0) {
      return;
    }

    setIsMarkAllPending(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkAllPending(false);
    }
  };

  const runNotificationAction = async (
    notificationId: string,
    action: "toggleRead" | "delete",
    callback: () => Promise<void>,
  ) => {
    if (pendingActionsByIdRef.current[notificationId]) {
      return;
    }

    setPendingActionsById((current) => ({
      ...current,
      [notificationId]: action,
    }));

    try {
      await callback();
    } finally {
      setPendingActionsById((current) => {
        const next = { ...current };
        delete next[notificationId];
        return next;
      });
    }
  };

  const handlePressNotification = useCallback(
    (item: AppNotification) => {
      if (pendingActionsByIdRef.current[item.id] === "delete") {
        return;
      }

      if (item.action_url) {
        router.push(item.action_url as any);
      }

      if (!item.is_read) {
        requestAnimationFrame(() => {
          void toggleRead(item, true).catch(() => undefined);
        });
      }
    },
    [router, toggleRead],
  );

  const handleToggleReadNotification = useCallback(
    (item: AppNotification) =>
      runNotificationAction(item.id, "toggleRead", async () => {
        await toggleRead(item, !item.is_read);
      }),
    [toggleRead],
  );

  const handleDeleteNotification = useCallback(
    (item: AppNotification) =>
      runNotificationAction(item.id, "delete", async () => {
        await deleteNotification(item);
      }),
    [deleteNotification],
  );

  const renderNotification = useCallback(
    ({ item }: ListRenderItemInfo<AppNotification>) => (
      <NotificationRow
        item={item}
        titleColor={pageStyles.titleText}
        bodyColor={pageStyles.bodyText}
        cardStyle={item.is_read ? pageStyles.readCard : pageStyles.unreadCard}
        unreadDotStyle={pageStyles.unreadDot}
        pendingAction={pendingActionsById[item.id] ?? null}
        onPressItem={handlePressNotification}
        onToggleReadItem={handleToggleReadNotification}
        onDeleteItem={handleDeleteNotification}
      />
    ),
    [
      handleDeleteNotification,
      handlePressNotification,
      handleToggleReadNotification,
      pageStyles.bodyText,
      pageStyles.readCard,
      pageStyles.titleText,
      pageStyles.unreadCard,
      pageStyles.unreadDot,
      pendingActionsById,
    ],
  );

  const listHeaderComponent = useMemo(
    () => (
      <>
        <View style={[styles.infoCard, pageStyles.infoCard]}>
          <View style={styles.infoAvatarFrame}>
            <Image
              contentFit="cover"
              source={require("@/assets/images/Eyrie_Mascot_1.png")}
              style={styles.infoAvatar}
            />
          </View>
          <View style={styles.infoBody}>
            <Text style={[styles.infoTitle, pageStyles.infoTitle]}>
              Intelligent finance alerts
            </Text>
            <Text style={[styles.infoText, pageStyles.infoText]}>
              {isOffline
                ? "Notifications are unavailable while offline. Please connect to the internet to receive updates."
                : !notificationsEnabled && !isPreferencesLoading
                  ? "Notifications are off. Turn them back on in Settings to receive alerts here again."
                  : preferences?.push_enabled
                    ? "Alerts, summaries, and goal milestones are now synced and will appear here in realtime."
                    : "In-app notifications are active. Enable system notification permission to receive local push alerts too."}
            </Text>
          </View>
        </View>

        {notificationsEnabled && !!notifications.length && !isOffline ? (
          <View style={[styles.swipeHintChip, pageStyles.swipeHintChip]}>
            <Feather
              name="move"
              size={13}
              color={pageStyles.swipeHintText.color}
            />
            <Text style={[styles.swipeHintText, pageStyles.swipeHintText]}>
              Swipe each notification left or right for quick actions
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={[styles.emptyStateCard, pageStyles.emptyCard, shadows.soft]}
          >
            <Feather name="alert-circle" size={22} color="#F97316" />
            <Text style={[styles.emptyStateTitle, pageStyles.title]}>
              Notifications need attention
            </Text>
            <Text style={[styles.emptyStateText, pageStyles.subtitle]}>
              {error}
            </Text>
          </View>
        ) : null}
      </>
    ),
    [
      error,
      isOffline,
      isPreferencesLoading,
      notifications.length,
      notificationsEnabled,
      pageStyles.emptyCard,
      pageStyles.infoCard,
      pageStyles.infoText,
      pageStyles.infoTitle,
      pageStyles.subtitle,
      pageStyles.swipeHintChip,
      pageStyles.swipeHintText,
      pageStyles.title,
      preferences?.push_enabled,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (isOffline && !isPreferencesLoading) {
      return (
        <View
          style={[styles.emptyStateCard, pageStyles.emptyCard, shadows.soft]}
        >
          <Feather name="wifi-off" size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyStateTitle, pageStyles.title]}>
            You're offline
          </Text>
          <Text style={[styles.emptyStateText, pageStyles.subtitle]}>
            Notifications are unavailable without an internet connection.
            Connect to the internet to receive and view your alerts.
          </Text>
        </View>
      );
    }

    if (!notificationsEnabled && !isPreferencesLoading) {
      return (
        <View
          style={[styles.emptyStateCard, pageStyles.emptyCard, shadows.soft, { marginTop: 16 }]}
        >
          <Feather name="bell-off" size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyStateTitle, pageStyles.title]}>
            Notifications are off
          </Text>
          <Text style={[styles.emptyStateText, pageStyles.subtitle]}>
            Enable the notifications toggle in Settings to receive budget
            alerts, goal progress, and weekly insights here.
          </Text>
          <Text style={[styles.emptyStateText, { fontSize: 12, marginTop: 12, fontStyle: "italic" }]}>
            Note: Notifications will not work in offline mode.
          </Text>
        </View>
      );
    }

    if (shouldShowBlockingLoadingState) {
      return (
        <View
          style={[styles.emptyStateCard, pageStyles.emptyCard, shadows.soft]}
        >
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.emptyStateTitle, pageStyles.title]}>
            Loading notifications...
          </Text>
          <Text style={[styles.emptyStateText, pageStyles.subtitle]}>
            Pulling your latest alerts and reminders.
          </Text>
        </View>
      );
    }

    if (notificationsEnabled && !error) {
      return (
        <View
          style={[styles.emptyStateCard, pageStyles.emptyCard, shadows.soft]}
        >
          <Feather name="bell" size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyStateTitle, pageStyles.title]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptyStateText, pageStyles.subtitle]}>
            Budget alerts, savings goal progress, and weekly insights will show
            up here automatically.
          </Text>
        </View>
      );
    }

    return <View style={styles.listEmptySpacer} />;
  }, [
    colors.mutedForeground,
    colors.primary,
    error,
    isOffline,
    isPreferencesLoading,
    notificationsEnabled,
    pageStyles.emptyCard,
    pageStyles.subtitle,
    pageStyles.title,
    shouldShowBlockingLoadingState,
  ]);

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <Pressable
              style={[styles.iconButton, pageStyles.iconButton]}
              onPress={() => {
                router.back();
                void triggerNavigationHaptic();
              }}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={colors.foreground}
              />
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, pageStyles.title]}>
                Notifications
              </Text>
              <Text style={[styles.subtitle, pageStyles.subtitle]}>
                {!notificationsEnabled && !isPreferencesLoading
                  ? "Notifications turned off"
                  : unreadCount > 0
                    ? `${unreadCount} unread`
                    : "All caught up"}
              </Text>
            </View>

            <Pressable
              style={[
                styles.iconButton,
                pageStyles.iconButton,
                (!notificationsEnabled || unreadCount === 0) &&
                  styles.iconButtonDisabled,
              ]}
              disabled={
                !notificationsEnabled || unreadCount === 0 || isMarkAllPending
              }
              onPress={() => void handleMarkAllAsRead().catch(() => undefined)}
            >
              {isMarkAllPending ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Feather name="check" size={20} color={colors.foreground} />
              )}
            </Pressable>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={notificationsEnabled ? notifications : []}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          contentContainerStyle={styles.listContent}
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={16}
          extraData={pendingActionsById}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollEndDrag={scheduleScrollOffsetPersist}
          onMomentumScrollEnd={scheduleScrollOffsetPersist}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 32,
  },
  listEmptySpacer: {
    height: 1,
  },
  infoCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    gap: 13,
  },
  infoAvatarFrame: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "#D8F7EC",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  infoAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
  },
  infoBody: { flex: 1 },
  infoTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: fontWeights.semibold,
  },
  infoText: {
    marginTop: 3,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.8,
  },
  swipeHintChip: {
    marginTop: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swipeHintText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeights.medium,
    opacity: 0.85,
  },
  notificationCardContainer: {
    marginTop: 14,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  notificationCardInner: {
    width: "100%",
  },
  notificationCardContent: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "flex-start",
    gap: 14,
  },
  notificationCardPressed: {
    opacity: 0.92,
  },
  notificationCardBusy: {
    opacity: 0.8,
  },
  notificationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
  },
  contentSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    flexWrap: "wrap",
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    flexShrink: 0,
    marginTop: 2,
  },
  notificationBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTime: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  notificationCategory: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
  },
  swipeAction: {
    width: 92,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 4,
  },
  swipeRead: {
    backgroundColor: "#1495FF",
    marginRight: 10,
  },
  swipeDelete: {
    backgroundColor: "#EF4444",
    marginLeft: 10,
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
  },
  emptyStateCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  emptyStateText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
