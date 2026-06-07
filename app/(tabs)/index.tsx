import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { PremiumCardGradient } from "@/components/premium-card-gradient";
import { CategoryAvatar } from "@/components/category-avatar";
import { themeColors } from "@/constants/colors";
import { MOTION_DURATION, createStaggerDelay } from "@/constants/motion";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets, type BudgetCycle } from "@/hooks/useBudgets";
import { WALLETS } from "@/constants/wallets";
import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import Logo from "@/components/logo";
import MerchantLogo from "@/components/merchant-logo";
import { defaultBrandTheme, getBrandTheme } from "@/constants/brand-themes";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useTransactions } from "@/hooks/useTransactions";
import {
  formatCurrency,
  useDashboardBootstrap,
  useDashboardError,
  useDashboardLoading,
  useDashboardStatus,
  useDashboardSummary,
  useRecentTransactions,
  useSpendingBreakdown,
} from "@/hooks/use-dashboard";
import {
  formatBudgetBalanceLabel,
  getBudgetProgressRatio,
  getBudgetStatusCopy,
  getBudgetUsagePercent,
  getBudgetVisualState,
} from "@/src/lib/budget-presentation";
import { formatBudgetCycleDateRange } from "@/src/db/utils/time";
import { buildHomeInsights } from "@/src/lib/home-insights";
import { triggerNavigationHaptic } from "@/src/lib/navigationHaptics";
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

const HOME_CONTENT_WIDTH = Dimensions.get("window").width - 32;
const HOME_CARD_GAP = 12;
const HOME_CARD_WIDTH = (HOME_CONTENT_WIDTH - HOME_CARD_GAP) / 2;
const HOME_CARD_HEIGHT = 138;
const BALANCE_VISIBILITY_STORAGE_KEY = "eyrie:home-balance-visibility";
const BUDGET_CYCLE_STORAGE_KEY = "eyrie:budget-cycle-selection";

type EmptyStateVariant = "cards" | "budgets" | "transactions";
type ThemePalette = (typeof themeColors)[keyof typeof themeColors];

interface PremiumEmptyStateProps {
  variant: EmptyStateVariant;
  title: string;
  body: string;
  eyebrow: string;
  ctaLabel?: string;
  onPress?: () => void;
  width?: number;
  delay?: number;
  colors: ThemePalette;
  colorScheme: "light" | "dark";
  mutedTextColor: string;
}

function getGreetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatHomeContextDate(value: Date) {
  return `Today, ${new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(value)}`;
}

const AccountsSectionSkeleton = memo(function AccountsSectionSkeleton({
  colors,
  colorScheme,
}: {
  colors: ThemePalette;
  colorScheme: "light" | "dark";
}) {
  const isLight = colorScheme === "light";
  const surface = isLight ? "#FFFFFF" : colors.card;
  const border = withOpacity(colors.border, isLight ? 0.88 : 0.96);
  const shine = withOpacity(colors.foreground, isLight ? 0.08 : 0.12);

  return (
    <>
      {[0, 1].map((index) => (
        <View
          key={`accounts-skeleton-${index}`}
          style={[
            styles.cardPressable,
            styles.accountSkeletonCard,
            {
              backgroundColor: surface,
              borderColor: border,
            },
          ]}
        >
          <View style={styles.accountSkeletonHeader}>
            <View
              style={[styles.accountSkeletonAvatar, { backgroundColor: shine }]}
            />
            <View style={styles.accountSkeletonHeaderCopy}>
              <View
                style={[
                  styles.accountSkeletonLine,
                  styles.accountSkeletonLinePrimary,
                  { backgroundColor: shine },
                ]}
              />
              <View
                style={[
                  styles.accountSkeletonLine,
                  styles.accountSkeletonLineSecondary,
                  {
                    backgroundColor: withOpacity(
                      colors.foreground,
                      isLight ? 0.05 : 0.08,
                    ),
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.accountSkeletonBalance, { backgroundColor: shine }]}
          />
          <View style={styles.accountSkeletonFooter}>
            <View
              style={[
                styles.accountSkeletonLine,
                styles.accountSkeletonLineTertiary,
                {
                  backgroundColor: withOpacity(
                    colors.foreground,
                    isLight ? 0.06 : 0.1,
                  ),
                },
              ]}
            />
            <View
              style={[
                styles.accountSkeletonTag,
                {
                  backgroundColor: withOpacity(
                    colors.foreground,
                    isLight ? 0.06 : 0.1,
                  ),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </>
  );
});

const HomeStartupSkeleton = memo(function HomeStartupSkeleton({
  colors,
  colorScheme,
  mutedTextColor,
}: {
  colors: ThemePalette;
  colorScheme: "light" | "dark";
  mutedTextColor: string;
}) {
  const isLight = colorScheme === "light";
  const line = withOpacity(colors.foreground, isLight ? 0.08 : 0.14);
  const lineSoft = withOpacity(colors.foreground, isLight ? 0.05 : 0.1);
  const surface = colors.card;
  const border = withOpacity(colors.border, isLight ? 0.88 : 0.96);

  return (
    <>
      <View style={styles.startupSkeletonStack}>
        <View
          style={[
            styles.startupInsightSkeleton,
            { backgroundColor: "#37D3C2" },
          ]}
        >
          <View
            style={[
              styles.startupInsightGlow,
              { backgroundColor: withOpacity("#FFFFFF", 0.12) },
            ]}
          />
          <View style={styles.startupInsightCopy}>
            <View
              style={[
                styles.startupPillSkeleton,
                { backgroundColor: withOpacity("#FFFFFF", 0.18) },
              ]}
            />
            <View
              style={[
                styles.startupInsightHeadlineSkeleton,
                { backgroundColor: withOpacity("#FFFFFF", 0.26) },
              ]}
            />
            <View
              style={[
                styles.startupInsightBodySkeleton,
                { backgroundColor: withOpacity("#FFFFFF", 0.22) },
              ]}
            />
            <View
              style={[
                styles.startupInsightBodyShortSkeleton,
                { backgroundColor: withOpacity("#FFFFFF", 0.22) },
              ]}
            />
            <View
              style={[
                styles.startupInsightButtonSkeleton,
                { backgroundColor: withOpacity("#FFFFFF", 0.82) },
              ]}
            />
          </View>
          <View
            style={[
              styles.startupInsightMascotSkeleton,
              { backgroundColor: withOpacity("#FFFFFF", 0.12) },
            ]}
          />
        </View>

        <View
          style={[
            styles.balanceCard,
            styles.startupBalanceSkeleton,
            { backgroundColor: surface, borderColor: border },
            shadows.card,
          ]}
        >
          <View style={styles.balanceTopRow}>
            <View style={styles.startupBalanceLabelWrap}>
              <View
                style={[styles.startupLabelSkeleton, { backgroundColor: line }]}
              />
              <View
                style={[
                  styles.startupEyeSkeleton,
                  { backgroundColor: lineSoft },
                ]}
              />
            </View>
            <View
              style={[
                styles.growthPill,
                styles.startupGrowthSkeleton,
                {
                  backgroundColor: isLight
                    ? "#EEF8F3"
                    : withOpacity("#16B76D", 0.18),
                },
              ]}
            />
          </View>
          <View style={styles.balanceAmountBlock}>
            <View
              style={[
                styles.startupCurrencySkeleton,
                { backgroundColor: withOpacity(colors.primary, 0.7) },
              ]}
            />
            <View
              style={[styles.startupAmountSkeleton, { backgroundColor: line }]}
            />
          </View>
          <View
            style={[
              styles.balanceMetaChip,
              pageStylesFromSkeleton(colors, colorScheme).sectionHintChip,
            ]}
          >
            <View
              style={[
                styles.startupMetaIconSkeleton,
                { backgroundColor: lineSoft },
              ]}
            />
            <View
              style={[
                styles.startupMetaTextSkeleton,
                { backgroundColor: lineSoft },
              ]}
            />
          </View>
          <View style={styles.metricsRow}>
            {[0, 1].map((item) => (
              <View
                key={`metric-skeleton-${item}`}
                style={[
                  styles.metricBlock,
                  styles.startupMetricSkeleton,
                  {
                    backgroundColor:
                      colorScheme === "light"
                        ? "#F7F9FC"
                        : withOpacity(colors.secondary, 0.44),
                    borderColor: withOpacity(colors.border, 0.78),
                  },
                ]}
              >
                <View style={styles.metricLabelRow}>
                  <View
                    style={[
                      styles.startupMetricDotSkeleton,
                      { backgroundColor: item === 0 ? "#14B86A" : "#F05454" },
                    ]}
                  />
                  <View
                    style={[
                      styles.startupMetricLabelSkeleton,
                      { backgroundColor: lineSoft },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.startupMetricAmountSkeleton,
                    { backgroundColor: line },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <View
              style={[
                styles.startupSectionTitleSkeleton,
                { backgroundColor: line },
              ]}
            />
            <View
              style={[
                styles.sectionHintChip,
                pageStylesFromSkeleton(colors, colorScheme).sectionHintChip,
                styles.startupSectionHintSkeleton,
              ]}
            >
              <View
                style={[
                  styles.startupMetaIconSkeleton,
                  { backgroundColor: lineSoft },
                ]}
              />
              <View
                style={[
                  styles.startupSectionHintTextSkeleton,
                  { backgroundColor: lineSoft },
                ]}
              />
            </View>
          </View>
          <View style={styles.hideRow}>
            <View
              style={[styles.startupEyeSkeleton, { backgroundColor: lineSoft }]}
            />
            <View
              style={[
                styles.startupHideTextSkeleton,
                { backgroundColor: lineSoft },
              ]}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          <AccountsSectionSkeleton colors={colors} colorScheme={colorScheme} />
        </ScrollView>

        <View style={[styles.sectionHeader, styles.walletsHeader]}>
          <View
            style={[
              styles.startupSectionTitleSkeleton,
              { backgroundColor: line },
            ]}
          />
        </View>

        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          <AccountsSectionSkeleton colors={colors} colorScheme={colorScheme} />
        </ScrollView>

        <View style={styles.startupFooterBlocks}>
          <View
            style={[
              styles.startupFooterBlock,
              { backgroundColor: surface, borderColor: border },
              shadows.soft,
            ]}
          />
          <View
            style={[
              styles.startupFooterBlock,
              { backgroundColor: surface, borderColor: border },
              shadows.soft,
            ]}
          />
        </View>
      </View>
      <Text style={[styles.startupLoadingCaption, { color: mutedTextColor }]}>
        Loading your dashboard…
      </Text>
    </>
  );
});

function pageStylesFromSkeleton(
  colors: ThemePalette,
  colorScheme: "light" | "dark",
) {
  return {
    sectionHintChip: {
      backgroundColor:
        colorScheme === "light"
          ? "rgba(255,255,255,0.78)"
          : withOpacity(colors.secondary, 0.36),
      borderColor: withOpacity(colors.border, 0.72),
    },
  };
}

const EmptyStateIllustration = memo(function EmptyStateIllustration({
  variant,
  colors,
  colorScheme,
}: Pick<PremiumEmptyStateProps, "variant" | "colors" | "colorScheme">) {
  const isLight = colorScheme === "light";
  const accent =
    variant === "budgets"
      ? "#2DBBBA"
      : variant === "transactions"
        ? "#7A8AA0"
        : colors.primary;

  if (variant === "cards") {
    return (
      <View style={styles.emptyVisualCards}>
        <LinearGradient
          colors={[
            withOpacity(colors.primary, isLight ? 0.14 : 0.22),
            withOpacity("#6EA8FF", isLight ? 0.28 : 0.2),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.emptyVisualCardLayer, styles.emptyVisualCardBack]}
        />
        <LinearGradient
          colors={
            isLight
              ? (["#61A3FF", "#3E7EFF"] as const)
              : ([withOpacity("#7EB0FF", 0.9), colors.primary] as const)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyVisualCardLayer}
        >
          <View style={styles.emptyVisualCardChip} />
          <View style={styles.emptyVisualCardDots}>
            <View style={styles.emptyVisualCardDot} />
            <View style={styles.emptyVisualCardDot} />
            <View style={styles.emptyVisualCardDot} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (variant === "budgets") {
    return (
      <View style={styles.emptyVisualBudget}>
        <View
          style={[
            styles.emptyVisualBudgetRing,
            { borderColor: withOpacity(accent, isLight ? 0.24 : 0.34) },
          ]}
        >
          <View
            style={[
              styles.emptyVisualBudgetRingFill,
              { backgroundColor: withOpacity(accent, isLight ? 0.16 : 0.22) },
            ]}
          />
          <MaterialCommunityIcons name="chart-donut" size={20} color={accent} />
        </View>
        <View style={styles.emptyVisualBudgetBars}>
          {[0.84, 0.58, 0.72].map((width, index) => (
            <View
              key={`${variant}-bar-${index}`}
              style={[
                styles.emptyVisualBudgetBarTrack,
                {
                  backgroundColor: withOpacity(
                    colors.foreground,
                    isLight ? 0.07 : 0.12,
                  ),
                },
              ]}
            >
              <View
                style={[
                  styles.emptyVisualBudgetBarFill,
                  {
                    width: `${width * 100}%`,
                    backgroundColor:
                      index === 1
                        ? withOpacity(colors.primary, isLight ? 0.26 : 0.42)
                        : withOpacity(accent, isLight ? 0.24 : 0.36),
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emptyVisualTransactions}>
      {[0.88, 0.72, 0.64].map((width, index) => (
        <View key={`${variant}-row-${index}`} style={styles.emptyVisualTxnRow}>
          <View
            style={[
              styles.emptyVisualTxnDot,
              { backgroundColor: withOpacity(colors.primary, 0.18) },
            ]}
          />
          <View style={styles.emptyVisualTxnCopy}>
            <View
              style={[
                styles.emptyVisualTxnLine,
                {
                  width: `${width * 100}%`,
                  backgroundColor: withOpacity(
                    colors.foreground,
                    isLight ? 0.11 : 0.16,
                  ),
                },
              ]}
            />
            <View
              style={[
                styles.emptyVisualTxnLineSmall,
                {
                  backgroundColor: withOpacity(
                    colors.foreground,
                    isLight ? 0.07 : 0.12,
                  ),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
});

const PremiumEmptyState = memo(function PremiumEmptyState({
  variant,
  title,
  body,
  eyebrow,
  ctaLabel,
  onPress,
  width,
  delay = 0,
  colors,
  colorScheme,
  mutedTextColor,
}: PremiumEmptyStateProps) {
  const isLight = colorScheme === "light";
  const accent =
    variant === "budgets"
      ? "#2DBBBA"
      : variant === "transactions"
        ? "#7A8AA0"
        : colors.primary;
  const iconName =
    variant === "budgets"
      ? "chart-box-outline"
      : variant === "transactions"
        ? "history"
        : "credit-card-outline";
  const gradientColors =
    variant === "budgets"
      ? ([
          withOpacity("#2DBBBA", isLight ? 0.08 : 0.12),
          "transparent",
        ] as const)
      : variant === "transactions"
        ? ([
            withOpacity(colors.primary, isLight ? 0.06 : 0.1),
            "transparent",
          ] as const)
        : ([
            withOpacity(colors.primary, isLight ? 0.08 : 0.12),
            "transparent",
          ] as const);

  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION_DURATION.LIST_ENTRY).delay(delay)}
      style={[
        styles.premiumEmptyCardWrap,
        styles.premiumEmptyCardShadow,
        width ? { width } : styles.premiumEmptyStretch,
      ]}
    >
      <View
        style={[
          styles.premiumEmptyCard,
          width ? { width: "100%" } : null,
          {
            backgroundColor: colors.card,
            borderColor: withOpacity(colors.border, isLight ? 0.88 : 0.96),
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumEmptyGradient}
        />
        <View
          pointerEvents="none"
          style={[
            styles.premiumEmptyGlow,
            {
              backgroundColor: withOpacity(accent, isLight ? 0.07 : 0.1),
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.premiumEmptyBlob,
            {
              backgroundColor: withOpacity(
                colors.primary,
                isLight ? 0.05 : 0.08,
              ),
            },
          ]}
        />

        <View style={styles.premiumEmptyVisualBlock}>
          <View
            style={[
              styles.premiumEmptyIconShell,
              {
                backgroundColor: withOpacity(accent, isLight ? 0.12 : 0.18),
                borderColor: withOpacity(accent, isLight ? 0.1 : 0.16),
              },
            ]}
          >
            <View
              style={[
                styles.premiumEmptyIconInner,
                {
                  backgroundColor: withOpacity(accent, isLight ? 0.16 : 0.24),
                },
              ]}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={16}
                color={accent}
              />
            </View>
          </View>
        </View>

        <View style={styles.premiumEmptyTextBlock}>
          <Text style={[styles.premiumEmptyEyebrow, { color: mutedTextColor }]}>
            {eyebrow}
          </Text>
          <Text
            style={[styles.premiumEmptyTitle, { color: colors.foreground }]}
          >
            {title}
          </Text>
          <Text style={[styles.premiumEmptyBody, { color: mutedTextColor }]}>
            {body}
          </Text>
        </View>

        <EmptyStateIllustration
          variant={variant}
          colors={colors}
          colorScheme={colorScheme}
        />

        {ctaLabel && onPress ? (
          <Pressable
            style={({ pressed }) => [
              styles.premiumEmptyButtonWrap,
              pressed && styles.premiumEmptyButtonWrapPressed,
            ]}
            onPress={onPress}
          >
            <LinearGradient
              colors={
                isLight
                  ? (["#62A5FF", "#2F7CF7"] as const)
                  : ([withOpacity("#74AEFF", 0.94), colors.primary] as const)
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumEmptyButton}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.premiumEmptyButtonText}>{ctaLabel}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const { user: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();
  const summary = useDashboardSummary();
  const recentTransactions = useRecentTransactions();
  const spendingBreakdown = useSpendingBreakdown();
  const dashboardStatus = useDashboardStatus();
  const isLoading = useDashboardLoading();
  const error = useDashboardError();
  const {
    accounts: allAccounts,
    isInitialLoading: accountsInitialLoading,
    hasResolved: accountsResolved,
  } = useAccounts();
  const { transactions } = useTransactions();
  const [selectedBudgetCycle, setSelectedBudgetCycle] =
    useState<BudgetCycle>("monthly");
  const { budgets: selectedCycleBudgets } = useBudgets(selectedBudgetCycle);
  const { goals } = useSavingsGoals();
  const [showCardsSwipeHint, setShowCardsSwipeHint] = useState(true);
  const [showWalletsSwipeHint, setShowWalletsSwipeHint] = useState(true);
  const [showTotalBalance, setShowTotalBalance] = useState(false);
  const [showCardBalances, setShowCardBalances] = useState(false);
  const [hasHydratedVisibilityPrefs, setHasHydratedVisibilityPrefs] =
    useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [insightIndex, setInsightIndex] = useState(0);
  const unreadNotificationCount = useNotificationStore(
    (state) => state.unreadCount,
  );
  const deferredTransactions = useDeferredValue(transactions);
  const deferredBudgets = useDeferredValue(selectedCycleBudgets);
  const deferredGoals = useDeferredValue(goals);

  useDashboardBootstrap(currentUser?.id);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      AsyncStorage.getItem(BUDGET_CYCLE_STORAGE_KEY)
        .then((storedValue) => {
          if (
            isActive &&
            (storedValue === "weekly" ||
              storedValue === "biweekly" ||
              storedValue === "monthly")
          ) {
            setSelectedBudgetCycle(storedValue);
          }
        })
        .catch(() => undefined);

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(BALANCE_VISIBILITY_STORAGE_KEY)
      .then((stored) => {
        if (!isMounted) {
          return;
        }

        if (!stored) {
          setHasHydratedVisibilityPrefs(true);
          return;
        }

        const parsed = JSON.parse(stored) as {
          showTotalBalance?: boolean;
          showCardBalances?: boolean;
        };

        if (typeof parsed.showTotalBalance === "boolean") {
          setShowTotalBalance(parsed.showTotalBalance);
        }

        if (typeof parsed.showCardBalances === "boolean") {
          setShowCardBalances(parsed.showCardBalances);
        }

        setHasHydratedVisibilityPrefs(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setHasHydratedVisibilityPrefs(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedVisibilityPrefs) {
      return;
    }

    AsyncStorage.setItem(
      BALANCE_VISIBILITY_STORAGE_KEY,
      JSON.stringify({
        showTotalBalance,
        showCardBalances,
      }),
    ).catch(() => undefined);
  }, [hasHydratedVisibilityPrefs, showCardBalances, showTotalBalance]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const visibleAccounts = useMemo(
    () => allAccounts.filter((account) => !account.isHidden),
    [allAccounts],
  );
  const cardAccounts = useMemo(
    () =>
      visibleAccounts.filter(
        (account) => account.type === "bank" || account.type === "credit",
      ),
    [visibleAccounts],
  );
  const walletAccounts = useMemo(
    () =>
      visibleAccounts.filter(
        (account) => account.type === "ewallet" || account.type === "cash",
      ),
    [visibleAccounts],
  );
  const showAccountsSkeleton = accountsInitialLoading && !accountsResolved;
  const showCardsEmptyState =
    accountsResolved && !accountsInitialLoading && cardAccounts.length === 0;
  const showWalletsEmptyState =
    accountsResolved && !accountsInitialLoading && walletAccounts.length === 0;
  const visibleBudgets = useMemo(
    () => selectedCycleBudgets.slice(0, 2),
    [selectedCycleBudgets],
  );
  const visibleRecentTransactions = useMemo(
    () => recentTransactions.slice(0, 3),
    [recentTransactions],
  );

  const resolveBrandName = (account: any) => {
    const nameLower = (account?.name || "").toLowerCase();

    const matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );

    if (matchWallet) return matchWallet.name;

    const matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );

    if (matchBank) return matchBank.name;

    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return key.toUpperCase();

    if (account?.type === "ewallet") return "E-WALLET";
    if (account?.type === "cash") return "CASH";
    if (account?.type === "credit") return "Credit";

    return "Bank";
  };

  const resolveLogo = (account: any) => {
    const nameLower = (account?.name || "").toLowerCase();

    const matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );
    if (matchWallet?.logo) return matchWallet.logo;

    const matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );
    if (matchBank?.logo) return matchBank.logo;

    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return LOGO_MAP[key];

    return undefined;
  };

  const resolveBrandTheme = (account: any) =>
    account ? getBrandTheme(account) : defaultBrandTheme;

  // Calculate total balance including ALL account types (bank, ewallet, cash, but NOT credit)
  // This matches the getTotalBalance query which includes bank, ewallet, and cash
  const totalBalanceIncludingCash = useMemo(
    () =>
      allAccounts
        .filter((account) => account.type !== "credit")
        .reduce((sum, account) => sum + (Number(account.balance) || 0), 0),
    [allAccounts],
  );

  const totalBalanceValue = summary?.totalBalance ?? totalBalanceIncludingCash;
  const hiddenMoneyValue = "••••••";
  const hiddenCardDigits = "••••";
  const isSensitiveUiReady = hasHydratedVisibilityPrefs;
  const shouldRevealTotalBalance = isSensitiveUiReady && showTotalBalance;
  const shouldRevealCardBalances = isSensitiveUiReady && showCardBalances;
  const hasResolvedSafeAreaTop = Platform.OS === "android" || insets.top > 0;
  const hasDashboardHydrated =
    !!currentUser?.id &&
    dashboardStatus.activeUserId === currentUser.id &&
    (dashboardStatus.lastLoadedAt !== null || dashboardStatus.error !== null);
  const isHomeStartupReady =
    hasResolvedSafeAreaTop &&
    isSensitiveUiReady &&
    !isCurrentUserLoading &&
    !!currentUser &&
    accountsResolved &&
    hasDashboardHydrated;
  const shouldShowHeaderSkeleton = !isHomeStartupReady;
  const greetingText = useMemo(
    () => getGreetingForHour(currentTime.getHours()),
    [currentTime],
  );
  const userInitials = useMemo(() => {
    if (!currentUser?.full_name) {
      return "YU";
    }

    return currentUser.full_name
      .split(/\s+/)
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [currentUser?.full_name]);
  const balanceContextLabel = useMemo(
    () => formatHomeContextDate(currentTime),
    [currentTime],
  );

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: colors.background },
      mutedText: {
        color: colorScheme === "light" ? "#5B6980" : colors.mutedForeground,
      },
      linkText: { color: colorScheme === "light" ? "#0E67F7" : colors.primary },
      whiteCard: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.94),
      },
      budgetWarningCard: {
        backgroundColor:
          colorScheme === "light" ? "#FFF9ED" : "rgba(68, 43, 8, 0.9)",
        borderColor:
          colorScheme === "light"
            ? "rgba(245, 158, 11, 0.28)"
            : "rgba(251, 191, 36, 0.22)",
      },
      budgetDangerCard: {
        backgroundColor:
          colorScheme === "light" ? "#FFF3F2" : "rgba(68, 18, 18, 0.92)",
        borderColor:
          colorScheme === "light"
            ? "rgba(239, 68, 68, 0.24)"
            : "rgba(248, 113, 113, 0.22)",
      },
      budgetProgressTrack: {
        backgroundColor: colorScheme === "light" ? "#E8EDF4" : "#1B2433",
      },
      balanceStatCard: {
        backgroundColor:
          colorScheme === "light"
            ? "#F7F9FC"
            : withOpacity(colors.secondary, 0.44),
        borderColor: withOpacity(colors.border, 0.78),
      },
      topButton: {
        backgroundColor: withOpacity(colors.secondary, 0.72),
        borderColor: withOpacity(colors.border, 0.84),
      },
      sectionHintChip: {
        backgroundColor:
          colorScheme === "light"
            ? "rgba(255,255,255,0.78)"
            : withOpacity(colors.secondary, 0.36),
        borderColor: withOpacity(colors.border, 0.72),
      },
      navBar: {
        backgroundColor: colors.card,
        borderColor: withOpacity(colors.border, 0.86),
      },
    }),
    [colorScheme, colors],
  );

  const generatedInsights = useMemo(
    () =>
      buildHomeInsights({
        summary,
        currentUser,
        transactions: deferredTransactions.map((item) => ({
          id: item.id,
          amount: item.amount,
          category: item.category,
          transactionDate: item.transactionDate,
          typeValue: item.typeValue,
        })),
        budgets: deferredBudgets.map((item) => ({
          id: item.id,
          title: item.categoryName,
          budgetLimit: item.budgetLimit,
          amountSpent: item.amountSpent,
          remainingAmount: item.remainingAmount,
          progress: item.progress,
        })),
        goals: deferredGoals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          isCompleted: goal.isCompleted,
          isArchived: goal.isArchived,
          metrics: goal.metrics,
        })),
        spendingBreakdown,
        referenceDate: currentTime,
      }),
    [
      currentTime,
      currentUser,
      deferredBudgets,
      deferredGoals,
      deferredTransactions,
      spendingBreakdown,
      summary,
    ],
  );
  const activeInsight = generatedInsights[insightIndex] ?? null;
  const insightMascotSource = useMemo(() => {
    if (!activeInsight) {
      return require("@/assets/images/Eyrie_Mascot_1.png");
    }

    if (activeInsight.mascot === 3) {
      return require("@/assets/images/Eyrie_Mascot_3.png");
    }

    if (activeInsight.mascot === 2) {
      return require("@/assets/images/Eyrie_Mascot_2.png");
    }

    return require("@/assets/images/Eyrie_Mascot_1.png");
  }, [activeInsight]);
  const fallbackInsight = useMemo(
    () => ({
      title: isLoading && !summary ? "Syncing Insight" : "Eyrie Insight",
      headline:
        isLoading && !summary
          ? "Loading your financial story"
          : error && !summary
            ? "Dashboard unavailable"
            : "Your dashboard is ready",
      body:
        isLoading && !summary
          ? "Fetching your latest budgets, goals, balances, and transactions from local data."
          : error && !summary
            ? "Your data will appear as soon as the local finance database is ready again."
            : "Track activity to unlock personalized goal, budget, savings, and spending insights.",
      ctaLabel: "See Insights",
      route: "/assistant" as const,
      pill:
        isLoading && !summary
          ? "Live sync"
          : error && !summary
            ? "Retrying"
            : "Ready",
      icon: {
        library: "material" as const,
        name: isLoading && !summary ? "progress-clock" : "star-outline",
      },
      gradient: ["#37D3C2", "#2DBBBA"] as const,
      pillBackground: "#D8FFF4",
      pillTextColor: "#0E7C74",
      bubble: withOpacity("#FFFFFF", 0.1),
    }),
    [error, isLoading, summary],
  );
  const displayedInsight = activeInsight ?? fallbackInsight;

  const handleInsightPress = () => {
    void triggerNavigationHaptic();
    router.push(displayedInsight.route);
  };

  useEffect(() => {
    setInsightIndex(0);
  }, [generatedInsights]);

  useEffect(() => {
    if (generatedInsights.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setInsightIndex((current) => (current + 1) % generatedInsights.length);
    }, 8000);

    return () => {
      clearInterval(timer);
    };
  }, [generatedInsights.length]);

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, pageStyles.background]}
    >
      <View style={styles.flex}>
        <View
          style={[
            styles.headerBlock,
            {
              paddingTop: insets.top + 10,
              minHeight: insets.top + 76,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarFrame}>
                {currentUser?.avatar_url ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: currentUser.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{userInitials}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerCopy}>
                {shouldShowHeaderSkeleton ? (
                  <View style={styles.headerSkeletonWrap}>
                    <View
                      style={[
                        styles.headerSkeletonLine,
                        styles.headerSkeletonGreeting,
                        {
                          backgroundColor: withOpacity(
                            colors.mutedForeground,
                            colorScheme === "light" ? 0.14 : 0.22,
                          ),
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.headerSkeletonLine,
                        styles.headerSkeletonName,
                        {
                          backgroundColor: withOpacity(
                            colors.foreground,
                            colorScheme === "light" ? 0.1 : 0.18,
                          ),
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.greeting, pageStyles.mutedText]}>
                      {greetingText}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.userName, { color: colors.foreground }]}
                    >
                      {currentUser?.first_name ?? "You"}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.headerButton, pageStyles.topButton]}
                onPress={() => {
                  void triggerNavigationHaptic();
                  router.push("/notifications");
                }}
              >
                <Feather name="bell" size={18} color={colors.mutedForeground} />
                {unreadNotificationCount > 0 ? (
                  <View style={styles.notificationDot} />
                ) : null}
              </Pressable>
              <Pressable
                style={[
                  styles.settingsButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  void triggerNavigationHaptic();
                  router.push("/settings");
                }}
              >
                <Feather
                  name="settings"
                  size={18}
                  color={colors.primaryForeground}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isHomeStartupReady ? (
            <HomeStartupSkeleton
              colors={colors}
              colorScheme={colorScheme}
              mutedTextColor={pageStyles.mutedText.color}
            />
          ) : (
            <>
              <LinearGradient
                colors={displayedInsight.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.insightCard}
              >
                <View style={styles.insightContent}>
                  <Animated.View
                    key={displayedInsight.id ?? displayedInsight.headline}
                    entering={FadeIn.duration(MOTION_DURATION.BASE)}
                    exiting={FadeOutUp.duration(MOTION_DURATION.FAST)}
                    style={styles.insightTextBlock}
                  >
                    <View style={styles.insightTitleRow}>
                      <View style={styles.insightIconWrap}>
                        {displayedInsight.icon.library === "material" ? (
                          <MaterialCommunityIcons
                            name={
                              displayedInsight.icon.name as ComponentProps<
                                typeof MaterialCommunityIcons
                              >["name"]
                            }
                            size={13}
                            color="#FFFFFF"
                          />
                        ) : (
                          <Feather
                            name={
                              displayedInsight.icon.name as ComponentProps<
                                typeof Feather
                              >["name"]
                            }
                            size={13}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                      <Text style={styles.insightTitle}>
                        {displayedInsight.title}
                      </Text>
                    </View>
                    <Text style={styles.insightHeadline}>
                      {displayedInsight.headline}
                    </Text>
                    <Text style={styles.insightBody}>
                      {displayedInsight.body}
                    </Text>
                    <View style={styles.insightFooterRow}>
                      <Pressable
                        style={[
                          styles.insightPill,
                          {
                            backgroundColor: displayedInsight.pillBackground,
                          },
                        ]}
                        onPress={handleInsightPress}
                      >
                        <Feather
                          name="arrow-up-right"
                          size={12}
                          color={displayedInsight.pillTextColor}
                        />
                        <Text
                          style={[
                            styles.insightPillText,
                            { color: displayedInsight.pillTextColor },
                          ]}
                        >
                          {displayedInsight.ctaLabel}
                        </Text>
                      </Pressable>
                      <Text style={styles.insightMetaText}>
                        {displayedInsight.pill}
                      </Text>
                    </View>
                  </Animated.View>
                  <View
                    style={[
                      styles.insightMascotWrap,
                      { backgroundColor: displayedInsight.bubble },
                    ]}
                  >
                    <Image
                      contentFit="cover"
                      source={insightMascotSource}
                      style={styles.insightMascot}
                    />
                  </View>
                </View>
              </LinearGradient>

              <View
                style={[styles.balanceCard, pageStyles.whiteCard, shadows.card]}
              >
                <View style={styles.balanceTopRow}>
                  <View style={styles.balanceLabelRow}>
                    <Text style={[styles.balanceLabel, pageStyles.mutedText]}>
                      Total Balance
                    </Text>
                    <Pressable
                      disabled={!isSensitiveUiReady}
                      onPress={() => setShowTotalBalance((value) => !value)}
                    >
                      <Feather
                        name={shouldRevealTotalBalance ? "eye" : "eye-off"}
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                  <View
                    style={[
                      styles.growthPill,
                      colorScheme === "light"
                        ? styles.growthPillLight
                        : styles.growthPillDark,
                    ]}
                  >
                    <Text style={styles.growthText}>{balanceContextLabel}</Text>
                    <Text style={styles.growthSubtext}>Updated today</Text>
                  </View>
                </View>

                <View style={styles.balanceAmountBlock}>
                  <Text style={styles.balanceCurrency}>₱</Text>
                  <Text
                    style={[styles.balanceAmount, { color: colors.foreground }]}
                  >
                    {!shouldRevealTotalBalance
                      ? hiddenMoneyValue
                      : isLoading && !summary
                        ? "---"
                        : formatCurrency(totalBalanceValue).replace("₱", "")}
                  </Text>
                </View>

                <View
                  style={[styles.balanceMetaChip, pageStyles.sectionHintChip]}
                >
                  <Feather
                    name="rotate-cw"
                    size={11}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.balanceMetaText, pageStyles.mutedText]}>
                    Monthly overview
                  </Text>
                </View>

                <View style={styles.metricsRow}>
                  <View
                    style={[styles.metricBlock, pageStyles.balanceStatCard]}
                  >
                    <View style={styles.metricLabelRow}>
                      <Feather
                        name="arrow-up-right"
                        size={13}
                        color="#14B86A"
                      />
                      <Text style={[styles.metricLabel, pageStyles.mutedText]}>
                        Income
                      </Text>
                    </View>
                    <Text style={styles.incomeAmount}>
                      {shouldRevealTotalBalance
                        ? summary
                          ? formatCurrency(summary.totalIncome)
                          : "---"
                        : hiddenMoneyValue}
                    </Text>
                  </View>

                  <View
                    style={[styles.metricBlock, pageStyles.balanceStatCard]}
                  >
                    <View style={styles.metricLabelRow}>
                      <Feather
                        name="arrow-down-right"
                        size={13}
                        color="#F05454"
                      />
                      <Text style={[styles.metricLabel, pageStyles.mutedText]}>
                        Expenses
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {shouldRevealTotalBalance
                        ? summary
                          ? formatCurrency(summary.totalExpenses)
                          : "---"
                        : hiddenMoneyValue}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    Cards
                  </Text>
                  <View
                    style={[styles.sectionHintChip, pageStyles.sectionHintChip]}
                  >
                    <Feather
                      name="arrow-up-right"
                      size={11}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[styles.sectionHintText, pageStyles.mutedText]}
                    >
                      Tap to view details
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.hideRow}
                  disabled={!isSensitiveUiReady}
                  onPress={() => setShowCardBalances((value) => !value)}
                >
                  <Feather
                    name={shouldRevealCardBalances ? "eye" : "eye-off"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.hideText, pageStyles.mutedText]}>
                    {shouldRevealCardBalances ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsRow}
                onScroll={(event) => {
                  if (
                    showCardsSwipeHint &&
                    event.nativeEvent.contentOffset.x > 8
                  ) {
                    setShowCardsSwipeHint(false);
                  }
                }}
                scrollEventThrottle={16}
              >
                {(() => {
                  if (showAccountsSkeleton) {
                    return (
                      <AccountsSectionSkeleton
                        colors={colors}
                        colorScheme={colorScheme}
                      />
                    );
                  }

                  if (showCardsEmptyState) {
                    return (
                      <PremiumEmptyState
                        variant="cards"
                        eyebrow="Card setup"
                        title="No cards yet"
                        body="Link your first card to track balances here."
                        ctaLabel="Add card"
                        width={HOME_CONTENT_WIDTH}
                        delay={70}
                        colors={colors}
                        colorScheme={colorScheme}
                        mutedTextColor={pageStyles.mutedText.color}
                        onPress={() =>
                          router.push({
                            pathname: "/add-bank-card-method-modal",
                            params: {
                              returnTo: "/(tabs)",
                              parentTo: "/(tabs)",
                            },
                          })
                        }
                      />
                    );
                  }

                  return [
                    ...cardAccounts.map((acct) =>
                      (() => {
                        const brandTheme = resolveBrandTheme(acct);

                        return (
                          <Pressable
                            key={acct.id}
                            style={styles.cardPressable}
                            onPress={() =>
                              router.push({
                                pathname: "/payment-card-details-modal",
                                params: {
                                  accountId: acct.id,
                                  hideActions: "1",
                                },
                              })
                            }
                          >
                            <PremiumCardGradient
                              theme={brandTheme}
                              isDark={colorScheme === "dark"}
                              variant="card"
                              style={styles.accountCard}
                            >
                              <View style={styles.cardTopRow}>
                                <View style={styles.cardBrandRow}>
                                  <Logo
                                    size={34}
                                    logo={resolveLogo(acct)}
                                    name={resolveBrandName(acct)}
                                    backgroundColor={brandTheme.primary}
                                  />
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.cardName,
                                      { color: brandTheme.text },
                                    ]}
                                  >
                                    {resolveBrandName(acct)}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.cardAmount,
                                  { color: brandTheme.text },
                                ]}
                              >
                                {shouldRevealCardBalances
                                  ? formatCurrency(
                                      acct.balance ?? 0,
                                      acct.currencyCode,
                                    )
                                  : hiddenMoneyValue}
                              </Text>
                              <View style={styles.cardBottomRow}>
                                <Text
                                  style={[
                                    styles.cardDigits,
                                    {
                                      color: withOpacity(brandTheme.text, 0.78),
                                    },
                                  ]}
                                >
                                  {shouldRevealCardBalances
                                    ? `•••• ${acct.accountNumberLast4 ?? ""}`
                                    : hiddenCardDigits}
                                </Text>
                                <Text
                                  style={[
                                    styles.cardType,
                                    {
                                      color: withOpacity(brandTheme.text, 0.76),
                                    },
                                  ]}
                                >
                                  {acct.type === "credit" ? "CREDIT" : "DEBIT"}
                                </Text>
                              </View>
                            </PremiumCardGradient>
                          </Pressable>
                        );
                      })(),
                    ),
                    <Pressable
                      key="add-account-card"
                      style={[
                        styles.cardPressable,
                        styles.addAccountCardPressable,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/add-bank-card-method-modal",
                          params: {
                            returnTo: "/(tabs)",
                            parentTo: "/(tabs)",
                          },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.addAccountCard,
                          pageStyles.whiteCard,
                          { borderColor: withOpacity(colors.border, 0.95) },
                        ]}
                      >
                        <View style={styles.addAccountIconWrap}>
                          <Feather name="plus" size={16} color="#2FAF66" />
                        </View>
                        <Text
                          style={[
                            styles.addAccountLabel,
                            { color: colors.foreground },
                          ]}
                        >
                          Add Card
                        </Text>
                      </View>
                    </Pressable>,
                  ];
                })()}
              </ScrollView>
              {cardAccounts.length >= 2 && showCardsSwipeHint ? (
                <View style={styles.swipeHintRow}>
                  <View style={styles.swipeHintDots}>
                    <View
                      style={[styles.swipeHintDot, styles.swipeHintDotActive]}
                    />
                    <View style={styles.swipeHintDot} />
                    <View style={styles.swipeHintDot} />
                  </View>
                  <Text style={[styles.swipeHintText, pageStyles.mutedText]}>
                    Swipe to view more
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={colors.mutedForeground}
                  />
                </View>
              ) : null}

              <View style={[styles.sectionHeader, styles.walletsHeader]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Wallets
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsRow}
                onScroll={(event) => {
                  if (
                    showWalletsSwipeHint &&
                    event.nativeEvent.contentOffset.x > 8
                  ) {
                    setShowWalletsSwipeHint(false);
                  }
                }}
                scrollEventThrottle={16}
              >
                {(() => {
                  if (showAccountsSkeleton) {
                    return (
                      <AccountsSectionSkeleton
                        colors={colors}
                        colorScheme={colorScheme}
                      />
                    );
                  }

                  if (showWalletsEmptyState) {
                    return (
                      <View
                        style={[
                          styles.emptyCard,
                          {
                            backgroundColor:
                              pageStyles.whiteCard.backgroundColor,
                            borderColor: withOpacity(colors.border, 0.9),
                          },
                          shadows.soft,
                        ]}
                      >
                        <View style={styles.emptyCardHero}>
                          <View
                            style={[
                              styles.emptyCardIconWrap,
                              {
                                backgroundColor:
                                  colorScheme === "light"
                                    ? "#E7FAEF"
                                    : withOpacity("#16B76D", 0.22),
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="wallet-outline"
                              size={24}
                              color="#16B76D"
                            />
                          </View>
                          <Text
                            style={[
                              styles.emptyCardEyebrow,
                              pageStyles.mutedText,
                            ]}
                          >
                            Wallet Setup
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.emptyCardTitle,
                            { color: colors.foreground },
                          ]}
                        >
                          No wallets yet
                        </Text>
                        <Text
                          style={[styles.emptyCardBody, pageStyles.mutedText]}
                        >
                          Connect your first e-wallet or cash account to track
                          balances.
                        </Text>
                        <Pressable
                          style={[
                            styles.emptyCardButton,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: "/add-e-wallet-method-modal",
                              params: {
                                returnTo: "/(tabs)",
                                parentTo: "/(tabs)",
                              },
                            })
                          }
                        >
                          <View style={styles.emptyCardButtonContent}>
                            <Feather name="plus" size={15} color="#FFFFFF" />
                            <Text style={styles.emptyCardButtonText}>
                              Add wallet
                            </Text>
                          </View>
                        </Pressable>
                      </View>
                    );
                  }

                  return [
                    ...walletAccounts.map((acct) =>
                      (() => {
                        const brandTheme = resolveBrandTheme(acct);

                        return (
                          <Pressable
                            key={acct.id}
                            style={styles.cardPressable}
                            onPress={() =>
                              router.push({
                                pathname: "/payment-wallet-details-modal",
                                params: {
                                  accountId: acct.id,
                                  hideActions: "1",
                                },
                              })
                            }
                          >
                            <PremiumCardGradient
                              theme={brandTheme}
                              isDark={colorScheme === "dark"}
                              variant="wallet"
                              style={styles.accountCard}
                            >
                              <View style={styles.cardTopRow}>
                                <View style={styles.cardBrandRow}>
                                  <Logo
                                    size={34}
                                    logo={resolveLogo(acct)}
                                    name={resolveBrandName(acct)}
                                    backgroundColor={brandTheme.primary}
                                  />
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.cardName,
                                      { color: brandTheme.text },
                                    ]}
                                  >
                                    {resolveBrandName(acct)}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.walletAmount,
                                  { color: brandTheme.text },
                                ]}
                              >
                                {shouldRevealCardBalances
                                  ? formatCurrency(
                                      acct.balance ?? 0,
                                      acct.currencyCode,
                                    )
                                  : hiddenMoneyValue}
                              </Text>
                              <View style={styles.cardBottomRow}>
                                <Text
                                  style={[
                                    styles.cardDigits,
                                    {
                                      color: withOpacity(brandTheme.text, 0.78),
                                    },
                                  ]}
                                >
                                  {hiddenCardDigits}
                                </Text>
                                <Text
                                  style={[
                                    styles.cardType,
                                    {
                                      color: withOpacity(brandTheme.text, 0.76),
                                    },
                                  ]}
                                >
                                  {acct.type === "cash" ? "CASH" : "E-WALLET"}
                                </Text>
                              </View>
                            </PremiumCardGradient>
                          </Pressable>
                        );
                      })(),
                    ),
                    <Pressable
                      key="add-account-wallet"
                      style={[
                        styles.cardPressable,
                        styles.addAccountCardPressable,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/add-e-wallet-method-modal",
                          params: {
                            returnTo: "/(tabs)",
                            parentTo: "/(tabs)",
                          },
                        })
                      }
                    >
                      <View
                        style={[
                          styles.addAccountCard,
                          pageStyles.whiteCard,
                          { borderColor: withOpacity(colors.border, 0.95) },
                        ]}
                      >
                        <View style={styles.addAccountIconWrap}>
                          <Feather name="plus" size={16} color="#2FAF66" />
                        </View>
                        <Text
                          style={[
                            styles.addAccountLabel,
                            { color: colors.foreground },
                          ]}
                        >
                          Add Wallet
                        </Text>
                      </View>
                    </Pressable>,
                  ];
                })()}
              </ScrollView>
              {walletAccounts.length >= 2 && showWalletsSwipeHint ? (
                <View style={styles.swipeHintRow}>
                  <View style={styles.swipeHintDots}>
                    <View
                      style={[styles.swipeHintDot, styles.swipeHintDotActive]}
                    />
                    <View style={styles.swipeHintDot} />
                    <View style={styles.swipeHintDot} />
                  </View>
                  <Text style={[styles.swipeHintText, pageStyles.mutedText]}>
                    Swipe to view more
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={colors.mutedForeground}
                  />
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Budget Progress
                </Text>
                <Pressable
                  style={styles.linkRow}
                  onPress={() => router.push("/explore")}
                >
                  <Text style={[styles.sectionLink, pageStyles.linkText]}>
                    See all
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colorScheme === "light" ? "#0E67F7" : colors.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.budgetList}>
                {visibleBudgets.length ? (
                  visibleBudgets.map((item, index) => {
                    const visualState = getBudgetVisualState(
                      item.amountSpent,
                      item.budgetLimit,
                    );
                    const usagePercent = getBudgetUsagePercent(
                      item.amountSpent,
                      item.budgetLimit,
                    );
                    const statusCopy = getBudgetStatusCopy(
                      visualState,
                      Math.max(0, item.amountSpent - item.budgetLimit),
                      usagePercent,
                    );
                    const remainingLabel = formatBudgetBalanceLabel(
                      item.remainingAmount,
                    );
                    const progressRatio = getBudgetProgressRatio(
                      item.amountSpent,
                      item.budgetLimit,
                    );
                    const progressWidth = `${Math.min(progressRatio, 1) * 100}%`;
                    const progressColor =
                      visualState === "over"
                        ? "#EF4444"
                        : visualState === "warning"
                          ? "#F59E0B"
                          : item.categoryColor;
                    const isZeroBudget = item.budgetLimit <= 0;

                    return (
                      <Animated.View
                        key={item.id}
                        entering={FadeInDown.duration(
                          MOTION_DURATION.LIST_ENTRY,
                        ).delay(createStaggerDelay(index))}
                        style={[
                          styles.budgetCard,
                          pageStyles.whiteCard,
                          visualState === "warning"
                            ? pageStyles.budgetWarningCard
                            : null,
                          visualState === "over"
                            ? pageStyles.budgetDangerCard
                            : null,
                          shadows.soft,
                        ]}
                      >
                        <View style={styles.budgetTopRow}>
                          <View style={styles.budgetIdentity}>
                            <View
                              style={[
                                styles.budgetIconWrap,
                                {
                                  backgroundColor: withOpacity(
                                    item.categoryColor,
                                    0.16,
                                  ),
                                },
                              ]}
                            >
                              <CategoryAvatar
                                category={{
                                  iconType: item.categoryIconType,
                                  iconName: item.categoryIcon,
                                  iconImageUri: item.categoryIconImageUri,
                                  emoji: item.categoryEmoji,
                                  color: item.categoryColor,
                                }}
                                size={22}
                              />
                            </View>
                            <View style={styles.budgetTextBlock}>
                              <Text
                                style={[
                                  styles.budgetTitle,
                                  { color: colors.foreground },
                                ]}
                              >
                                {item.categoryName}
                              </Text>
                              <Text
                                style={[
                                  styles.budgetTransactions,
                                  pageStyles.mutedText,
                                ]}
                              >
                                {item.transactionCount} transaction
                                {item.transactionCount === 1 ? "" : "s"}
                              </Text>
                              <Text
                                style={[
                                  styles.budgetCycleRange,
                                  pageStyles.mutedText,
                                ]}
                              >
                                {formatBudgetCycleDateRange(
                                  item.startDate,
                                  item.endDate,
                                )}
                              </Text>
                              {visualState !== "safe" && !isZeroBudget ? (
                                <Animated.View
                                  entering={FadeIn.duration(
                                    MOTION_DURATION.BASE,
                                  )}
                                  exiting={FadeOutUp.duration(
                                    MOTION_DURATION.FAST,
                                  )}
                                  style={[
                                    styles.budgetBadge,
                                    visualState === "over"
                                      ? styles.budgetBadgeDanger
                                      : styles.budgetBadgeWarning,
                                  ]}
                                >
                                  <Feather
                                    name={statusCopy.icon}
                                    size={12}
                                    color={
                                      visualState === "over"
                                        ? "#B91C1C"
                                        : "#B45309"
                                    }
                                  />
                                  <Text
                                    style={[
                                      styles.budgetBadgeText,
                                      visualState === "over"
                                        ? styles.budgetBadgeTextDanger
                                        : styles.budgetBadgeTextWarning,
                                    ]}
                                  >
                                    {statusCopy.short}
                                  </Text>
                                </Animated.View>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        <View style={styles.budgetBody}>
                          <View style={styles.budgetAmountsRow}>
                            <Text
                              style={[styles.budgetSpent, pageStyles.mutedText]}
                            >
                              {isZeroBudget
                                ? "No budget created yet"
                                : `${formatCurrency(item.amountSpent)} / ${formatCurrency(item.budgetLimit)}`}
                            </Text>
                            <Text
                              style={[
                                styles.budgetRemaining,
                                { color: progressColor },
                              ]}
                            >
                              {remainingLabel.value}{" "}
                              <Text
                                style={[
                                  styles.budgetRemainingLabel,
                                  pageStyles.mutedText,
                                ]}
                              >
                                {remainingLabel.suffix === "remaining"
                                  ? "left"
                                  : remainingLabel.suffix}
                              </Text>
                            </Text>
                          </View>

                          {!isZeroBudget && visualState !== "safe" ? (
                            <Animated.View
                              entering={FadeIn.duration(MOTION_DURATION.BASE)}
                              exiting={FadeOutUp.duration(MOTION_DURATION.FAST)}
                              style={[
                                styles.budgetAlertRow,
                                visualState === "over"
                                  ? styles.budgetAlertRowDanger
                                  : styles.budgetAlertRowWarning,
                              ]}
                            >
                              <Feather
                                name={statusCopy.icon}
                                size={12}
                                color={
                                  visualState === "over" ? "#DC2626" : "#D97706"
                                }
                              />
                              <Text
                                style={[
                                  styles.budgetAlertText,
                                  {
                                    color:
                                      visualState === "over"
                                        ? "#DC2626"
                                        : "#D97706",
                                  },
                                ]}
                              >
                                {visualState === "over"
                                  ? statusCopy.long
                                  : statusCopy.usageLabel}
                              </Text>
                            </Animated.View>
                          ) : null}

                          <View
                            style={[
                              styles.progressTrack,
                              pageStyles.budgetProgressTrack,
                            ]}
                          >
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: progressWidth,
                                  backgroundColor: progressColor,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </Animated.View>
                    );
                  })
                ) : isLoading ? (
                  <View
                    style={[
                      styles.emptyStateCard,
                      pageStyles.whiteCard,
                      shadows.soft,
                    ]}
                  >
                    <ActivityIndicator color={colors.primary} />
                    <Text
                      style={[
                        styles.emptyStateTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Loading budgets
                    </Text>
                    <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                      Pulling your active budget progress from the local
                      database.
                    </Text>
                  </View>
                ) : (
                  <PremiumEmptyState
                    variant="budgets"
                    eyebrow="Budget progress"
                    title="No active budgets yet"
                    body="Create a budget to see live category progress."
                    ctaLabel="Create budget"
                    delay={120}
                    colors={colors}
                    colorScheme={colorScheme}
                    mutedTextColor={pageStyles.mutedText.color}
                    onPress={() =>
                      router.push({
                        pathname: "/add-category-modal",
                        params: { cycle: "monthly" },
                      })
                    }
                  />
                )}
              </View>

              <View style={[styles.sectionHeader, styles.recentHeader]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Recent Transactions
                </Text>
                <Pressable
                  style={styles.linkRow}
                  onPress={() => router.push("/transactions")}
                >
                  <Text style={[styles.sectionLink, pageStyles.linkText]}>
                    See all
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colorScheme === "light" ? "#0E67F7" : colors.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.transactionList}>
                {visibleRecentTransactions.length ? (
                  visibleRecentTransactions.map((item) => {
                    const hasMerchantLogo = Boolean(
                      getMerchantLogo(item.merchant),
                    );
                    const usesUploadedCategoryImage =
                      !item.isPaylaterTransaction &&
                      item.categoryIconType === "uploaded_image" &&
                      Boolean(item.categoryIconImageUri);

                    return (
                      <View key={item.id} style={styles.transactionRow}>
                        <View
                          style={[
                            styles.transactionIconWrap,
                            {
                              backgroundColor: hasMerchantLogo ||
                                usesUploadedCategoryImage
                                ? item.isPaylaterTransaction
                                  ? item.iconBackground
                                  : "transparent"
                                : item.iconBackground,
                            },
                          ]}
                        >
                          {item.isPaylaterTransaction ? (
                            <MerchantLogo
                              merchant={null}
                              size={46}
                              fallbackIcon={{
                                library: item.iconLibrary,
                                name: item.iconName,
                                color: item.iconColor,
                              }}
                            />
                          ) : hasMerchantLogo ? (
                            <MerchantLogo
                              merchant={item.merchant}
                              size={46}
                              fallbackIcon={{
                                library: item.iconLibrary,
                                name: item.iconName,
                                color: item.iconColor,
                              }}
                            />
                          ) : item.categoryIconType ? (
                            <CategoryAvatar
                              category={{
                                iconType: item.categoryIconType,
                                iconName: item.categoryIconName,
                                iconImageUri: item.categoryIconImageUri,
                                emoji: item.categoryEmoji,
                                color: item.categoryColor ?? item.iconColor,
                              }}
                              size={usesUploadedCategoryImage ? 42 : 24}
                            />
                          ) : (
                            <MerchantLogo
                              merchant={item.merchant}
                              size={46}
                              fallbackIcon={{
                                library: item.iconLibrary,
                                name: item.iconName,
                                color: item.iconColor,
                              }}
                            />
                          )}
                        </View>
                        <View style={styles.transactionContent}>
                          <View style={styles.transactionDetails}>
                            <Text
                              style={[
                                styles.transactionTitle,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={1}
                            >
                              {item.merchant}
                            </Text>
                            <Text
                              style={[
                                styles.transactionCategory,
                                pageStyles.mutedText,
                              ]}
                              numberOfLines={1}
                            >
                              {item.category} · {item.typeLabel}
                            </Text>
                          </View>
                          <View style={styles.transactionAmountBlock}>
                            <Text
                              style={[
                                styles.transactionAmount,
                                {
                                  color: item.isIncome
                                    ? "#00A76F"
                                    : colors.foreground,
                                },
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {item.amountLabel}
                            </Text>
                            <Text
                              style={[
                                styles.transactionDate,
                                pageStyles.mutedText,
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {item.dateLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : isLoading ? (
                  <View
                    style={[
                      styles.emptyStateCard,
                      pageStyles.whiteCard,
                      shadows.soft,
                    ]}
                  >
                    <ActivityIndicator color={colors.primary} />
                    <Text
                      style={[
                        styles.emptyStateTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Loading transactions
                    </Text>
                    <Text style={[styles.emptyStateBody, pageStyles.mutedText]}>
                      Fetching your latest movement from SQLite.
                    </Text>
                  </View>
                ) : (
                  <PremiumEmptyState
                    variant="transactions"
                    eyebrow="Activity feed"
                    title="No recent transactions"
                    body="Add a transaction to start building your history."
                    ctaLabel="Add transaction"
                    delay={170}
                    colors={colors}
                    colorScheme={colorScheme}
                    mutedTextColor={pageStyles.mutedText.color}
                    onPress={() => router.push("/modal")}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    minHeight: 76,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 184,
  },
  startupSkeletonStack: {
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: {
    minHeight: 46,
    justifyContent: "center",
    minWidth: 132,
    maxWidth: HOME_CONTENT_WIDTH - 120,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "#BEEFF0",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: "#1495FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: "#08121D",
  },
  greeting: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  headerSkeletonWrap: {
    minHeight: 46,
    justifyContent: "center",
    gap: 6,
  },
  headerSkeletonLine: {
    borderRadius: radius.full,
  },
  headerSkeletonGreeting: {
    width: 108,
    height: 14,
  },
  headerSkeletonName: {
    width: 128,
    height: 22,
  },
  userName: {
    fontFamily: fontFamilies.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "#F05454",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  insightCard: {
    marginTop: 4,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: "hidden",
    minHeight: 206,
  },
  insightContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  insightTextBlock: {
    flex: 1,
    paddingRight: 10,
    minHeight: 182,
  },
  insightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: withOpacity("#FFFFFF", 0.18),
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  insightHeadline: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.2,
    color: "#FFFFFF",
  },
  insightBody: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    color: "#EDFEFF",
  },
  insightFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  insightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: "#D8FFF4",
  },
  insightPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: "#0E7C74",
  },
  insightMetaText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.84),
  },
  insightMascotWrap: {
    width: 82,
    height: 82,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  insightMascot: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
  },
  balanceCard: {
    marginTop: 22,
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  growthPill: {
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  growthPillLight: {
    backgroundColor: "#E6F8ED",
  },
  growthPillDark: {
    backgroundColor: withOpacity("#0AA55E", 0.18),
  },
  growthText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: fontWeights.bold,
    color: "#12A25D",
    textAlign: "center",
  },
  growthSubtext: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    color: "#4D8D6A",
    textAlign: "center",
  },
  balanceAmountBlock: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  balanceCurrency: {
    fontFamily: fontFamilies.sans,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: fontWeights.bold,
    color: "#0E67F7",
    paddingBottom: 2,
  },
  balanceAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: fontWeights.bold,
    letterSpacing: -1,
  },
  balanceMetaChip: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  balanceMetaText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 6,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  metricLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  incomeAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeights.bold,
    color: "#0AA55E",
  },
  expenseAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeights.bold,
    color: "#FF4D4F",
  },
  sectionHeader: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletsHeader: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  sectionHintChip: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionHintText: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.3,
  },
  hideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hideText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  cardsRow: {
    marginTop: 10,
    paddingVertical: 4,
    flexGrow: 1,
    justifyContent: "center",
    gap: HOME_CARD_GAP,
  },
  swipeHintRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  swipeHintDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  swipeHintDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(107, 114, 128, 0.28)",
  },
  swipeHintDotActive: {
    width: 14,
    backgroundColor: "rgba(14, 103, 247, 0.42)",
  },
  swipeHintText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  cardPressable: {
    width: HOME_CARD_WIDTH,
    height: HOME_CARD_HEIGHT,
  },
  accountSkeletonCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  accountSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountSkeletonAvatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
  },
  accountSkeletonHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  accountSkeletonLine: {
    borderRadius: radius.full,
  },
  accountSkeletonLinePrimary: {
    width: "58%",
    height: 12,
  },
  accountSkeletonLineSecondary: {
    width: "36%",
    height: 9,
  },
  accountSkeletonBalance: {
    width: "74%",
    height: 24,
    borderRadius: 10,
  },
  accountSkeletonFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startupInsightSkeleton: {
    marginTop: 4,
    minHeight: 196,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  startupInsightGlow: {
    position: "absolute",
    top: 18,
    left: 22,
    width: 54,
    height: 54,
    borderRadius: radius.full,
  },
  startupInsightCopy: {
    flex: 1,
    gap: 12,
    paddingRight: 16,
  },
  startupPillSkeleton: {
    width: 134,
    height: 18,
    borderRadius: radius.full,
    marginTop: 6,
  },
  startupInsightHeadlineSkeleton: {
    width: "78%",
    height: 26,
    borderRadius: 12,
  },
  startupInsightBodySkeleton: {
    width: "92%",
    height: 18,
    borderRadius: 10,
  },
  startupInsightBodyShortSkeleton: {
    width: "72%",
    height: 18,
    borderRadius: 10,
  },
  startupInsightButtonSkeleton: {
    width: 116,
    height: 54,
    borderRadius: 22,
    marginTop: "auto",
  },
  startupInsightMascotSkeleton: {
    width: 128,
    height: 128,
    borderRadius: 42,
    alignSelf: "center",
  },
  startupBalanceSkeleton: {
    minHeight: 328,
  },
  startupBalanceLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  startupLabelSkeleton: {
    width: 136,
    height: 18,
    borderRadius: 10,
  },
  startupEyeSkeleton: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
  },
  startupGrowthSkeleton: {
    width: 150,
    minHeight: 78,
  },
  startupCurrencySkeleton: {
    width: 26,
    height: 42,
    borderRadius: 10,
  },
  startupAmountSkeleton: {
    width: 188,
    height: 30,
    borderRadius: 12,
  },
  startupMetaIconSkeleton: {
    width: 11,
    height: 11,
    borderRadius: radius.full,
  },
  startupMetaTextSkeleton: {
    width: 104,
    height: 14,
    borderRadius: 8,
  },
  startupMetricSkeleton: {
    minHeight: 128,
  },
  startupMetricDotSkeleton: {
    width: 13,
    height: 13,
    borderRadius: radius.full,
  },
  startupMetricLabelSkeleton: {
    width: 62,
    height: 14,
    borderRadius: 8,
  },
  startupMetricAmountSkeleton: {
    width: 110,
    height: 18,
    borderRadius: 9,
    marginTop: 22,
    alignSelf: "center",
  },
  startupSectionTitleSkeleton: {
    width: 98,
    height: 22,
    borderRadius: 10,
  },
  startupSectionHintSkeleton: {
    marginTop: 10,
  },
  startupSectionHintTextSkeleton: {
    width: 118,
    height: 14,
    borderRadius: 8,
  },
  startupHideTextSkeleton: {
    width: 42,
    height: 14,
    borderRadius: 8,
  },
  startupFooterBlocks: {
    gap: 16,
    marginTop: 8,
  },
  startupFooterBlock: {
    minHeight: 148,
    borderRadius: 26,
    borderWidth: 1,
  },
  startupLoadingCaption: {
    marginTop: 18,
    marginBottom: 12,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  accountSkeletonLineTertiary: {
    width: "34%",
    height: 10,
  },
  accountSkeletonTag: {
    width: 48,
    height: 10,
    borderRadius: radius.full,
  },
  addAccountCardPressable: {
    height: HOME_CARD_HEIGHT,
  },
  addAccountCard: {
    height: HOME_CARD_HEIGHT,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9F1ED",
  },
  addAccountIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF3D8",
  },
  addAccountLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  accountCard: {
    height: HOME_CARD_HEIGHT,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: "hidden",
  },
  cardBubbleLarge: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: radius.full,
    top: -6,
    right: -24,
  },
  cardBubbleSmall: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: radius.full,
    bottom: -14,
    right: -10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardBrandRow: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
    color: withOpacity("#FFFFFF", 0.72),
  },
  cardName: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.semibold,
    color: "#FFFFFF",
  },
  cardAmount: {
    marginTop: 20,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: fontWeights.semibold,
    color: "#FFFFFF",
  },
  cardBottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDigits: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeights.medium,
    letterSpacing: 1,
    color: withOpacity("#FFFFFF", 0.8),
  },
  cardType: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.6,
    color: withOpacity("#FFFFFF", 0.68),
  },
  walletAmount: {
    marginTop: 20,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: fontWeights.semibold,
    color: "#FFFFFF",
  },
  walletType: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeights.medium,
    color: withOpacity("#FFFFFF", 0.74),
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionLink: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
  budgetList: {
    marginTop: 14,
    gap: 14,
  },
  budgetCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  budgetIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  budgetIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetBody: {
    marginTop: 16,
  },
  budgetTextBlock: {
    flex: 1,
  },
  budgetTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.bold,
  },
  budgetTransactions: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  budgetCycleRange: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  budgetSpent: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  budgetBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  budgetBadgeWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.18)",
  },
  budgetBadgeDanger: {
    backgroundColor: "rgba(248, 113, 113, 0.16)",
  },
  budgetBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
  },
  budgetBadgeTextWarning: {
    color: "#B45309",
  },
  budgetBadgeTextDanger: {
    color: "#B91C1C",
  },
  budgetAmountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  budgetRemaining: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  budgetRemainingLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
  },
  budgetAlertRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  budgetAlertRowWarning: {
    opacity: 0.94,
  },
  budgetAlertRowDanger: {
    opacity: 0.98,
  },
  budgetAlertText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "#E8EDF4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "#0E7CEB",
  },
  recentHeader: {
    marginTop: 16,
  },
  transactionList: {
    marginTop: 8,
    gap: 14,
  },
  emptyStateCard: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  premiumEmptyCardWrap: {
    borderRadius: 24,
  },
  premiumEmptyCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: "center",
    gap: 6,
    minHeight: 136,
  },
  premiumEmptyCardShadow: {
    shadowColor: "#0C1425",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  premiumEmptyStretch: {
    alignSelf: "stretch",
  },
  premiumEmptyGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  premiumEmptyGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 999,
    top: -28,
    right: -18,
  },
  premiumEmptyBlob: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 999,
    bottom: -20,
    left: -12,
  },
  premiumEmptyVisualBlock: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  premiumEmptyIconShell: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 0,
  },
  premiumEmptyIconInner: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumEmptyTextBlock: {
    alignItems: "center",
    gap: 3,
    maxWidth: 284,
  },
  premiumEmptyEyebrow: {
    fontFamily: fontFamilies.sans,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.22,
    textTransform: "uppercase",
  },
  premiumEmptyTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: fontWeights.bold,
    textAlign: "center",
    letterSpacing: -0.15,
  },
  premiumEmptyBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  premiumEmptyButtonWrap: {
    borderRadius: 16,
    shadowColor: "#137CFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumEmptyButtonWrapPressed: {
    transform: [{ scale: 0.97 }],
  },
  premiumEmptyButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  premiumEmptyButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: fontWeights.medium,
    color: "#FFFFFF",
  },
  emptyVisualCards: {
    width: 58,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyVisualCardLayer: {
    position: "absolute",
    width: 34,
    height: 20,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  emptyVisualCardBack: {
    transform: [{ rotate: "-10deg" }, { translateX: -10 }, { translateY: 1 }],
  },
  emptyVisualCardChip: {
    width: 8,
    height: 5,
    borderRadius: 2,
    backgroundColor: withOpacity("#FFFFFF", 0.78),
    marginBottom: 4,
  },
  emptyVisualCardDots: {
    flexDirection: "row",
    gap: 2,
  },
  emptyVisualCardDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: withOpacity("#FFFFFF", 0.82),
  },
  emptyVisualBudget: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  emptyVisualBudgetRing: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyVisualBudgetRingFill: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  emptyVisualBudgetBars: {
    width: 38,
    gap: 3,
  },
  emptyVisualBudgetBarTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  emptyVisualBudgetBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  emptyVisualTransactions: {
    width: 78,
    gap: 4,
    paddingLeft: 0,
  },
  emptyVisualTxnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  emptyVisualTxnDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  emptyVisualTxnCopy: {
    flex: 1,
    gap: 3,
  },
  emptyVisualTxnLine: {
    height: 4,
    borderRadius: 999,
  },
  emptyVisualTxnLineSmall: {
    width: "52%",
    height: 3,
    borderRadius: 999,
  },
  emptyCard: {
    width: HOME_CONTENT_WIDTH,
    minHeight: 172,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyCardHero: {
    alignItems: "center",
    gap: 6,
  },
  emptyCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardEyebrow: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.2,
  },
  emptyCardTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  emptyCardBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyCardButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyCardButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    color: "#FFFFFF",
  },
  emptyStateTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  emptyStateBody: {
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 6,
  },
  transactionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    flexShrink: 1,
  },
  transactionCategory: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  transactionAmountBlock: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    flexShrink: 1,
    minWidth: 92,
    maxWidth: "42%",
  },
  transactionAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
    textAlign: "right",
    flexShrink: 1,
  },
  transactionDate: {
    marginTop: 4,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "right",
    flexShrink: 1,
  },
});
