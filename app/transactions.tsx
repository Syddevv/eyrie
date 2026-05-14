import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themeColors } from "@/constants/colors";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatCurrency } from "@/hooks/use-dashboard";
import {
  groupTransactionsBySection,
  transactionDateMatches,
  useTransactions,
  type TransactionListItem,
} from "@/hooks/useTransactions";
import { useManualSync, useSyncStatus } from "@/src/sync";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function renderTransactionIcon(transaction: TransactionListItem) {
  if (transaction.iconLibrary === "material") {
    return (
      <MaterialCommunityIcons
        name={
          transaction.iconName as React.ComponentProps<
            typeof MaterialCommunityIcons
          >["name"]
        }
        size={22}
        color={transaction.iconColor}
      />
    );
  }

  return (
    <Feather
      name={
        transaction.iconName as React.ComponentProps<typeof Feather>["name"]
      }
      size={20}
      color={transaction.iconColor}
    />
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  );
  const leadingDays = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const cells: { key: string; date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    const date = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      index - leadingDays + 1,
    );
    cells.push({ key: `prev-${index}`, date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    cells.push({ key: `current-${day}`, date, inMonth: true });
  }

  const remainder = cells.length % 7;

  if (remainder !== 0) {
    const trailing = 7 - remainder;

    for (let index = 1; index <= trailing; index += 1) {
      const date = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        index,
      );
      cells.push({ key: `next-${index}`, date, inMonth: false });
    }
  }

  return cells;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const { transactions, summary, isLoading, refresh } = useTransactions();
  const { syncNow, isSyncing } = useManualSync();
  const { isOnline, lastSyncedAt, pendingCount, uiState, isRestoring } =
    useSyncStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(
    selectedDate ?? new Date(),
  );

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
      searchBar: {
        backgroundColor: isDark
          ? "#161D29"
          : withOpacity(colors.secondary, 0.9),
      },
      searchText: { color: isDark ? "#8D97A7" : "#758094" },
      incomeCard: {
        backgroundColor: isDark ? "#07261D" : "#DDF8E8",
      },
      expenseCard: {
        backgroundColor: isDark ? "#2A0913" : "#FFE0E6",
      },
      sectionLabel: { color: isDark ? "#A1ABBA" : "#6B7485" },
      groupCard: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : withOpacity(colors.border, 0.92),
      },
      divider: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : withOpacity(colors.border, 0.84),
      },
      incomeAmount: { color: "#00C665" },
      defaultAmount: { color: isDark ? "#FFFFFF" : colors.foreground },
      chevron: { color: isDark ? "#7F8897" : "#8C94A3" },
      filterChip: {
        backgroundColor: isDark
          ? "#161D29"
          : withOpacity(colors.secondary, 0.9),
      },
      filterChipActive: {
        backgroundColor: colors.primary,
      },
      filterChipText: { color: isDark ? "#F8FAFC" : "#111827" },
      filterChipTextActive: { color: "#FFFFFF" },
      calendarCard: {
        backgroundColor: colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.08)",
      },
      calendarText: { color: colors.foreground },
      mutedCalendarText: { color: colors.mutedForeground },
      dayOutsideText: { color: isDark ? "#475569" : "#B2BCCB" },
      todayRing: { borderColor: colors.primary },
    }),
    [colors, isDark],
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth],
  );

  const filteredSections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredTransactions = transactions.filter((transaction) => {
      const matchesQuery =
        !normalizedQuery ||
        transaction.title.toLowerCase().includes(normalizedQuery) ||
        transaction.category.toLowerCase().includes(normalizedQuery) ||
        transaction.type.toLowerCase().includes(normalizedQuery);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "income" && transaction.typeValue === "income") ||
        (typeFilter === "expense" && transaction.typeValue === "expense");

      const matchesDate = transactionDateMatches(transaction, selectedDate);

      return matchesQuery && matchesType && matchesDate;
    });

    return groupTransactionsBySection(filteredTransactions);
  }, [searchQuery, selectedDate, transactions, typeFilter]);

  const visibleCount = filteredSections.reduce(
    (count, section) => count + section.items.length,
    0,
  );

  const syncLabel = isRestoring
    ? "Restoring your data..."
    : uiState === "offline"
      ? "Offline mode"
      : uiState === "retrying"
        ? "Retrying sync..."
        : isSyncing
          ? "Syncing..."
          : lastSyncedAt
            ? `Last synced ${new Intl.DateTimeFormat("en-PH", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(lastSyncedAt))}`
            : "Not synced yet";

  return (
    <SafeAreaView style={[styles.safeArea, pageStyles.background]}>
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <View style={styles.topRow}>
            <Pressable
              style={[styles.backButton, pageStyles.iconButton]}
              onPress={() => router.back()}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={colors.foreground}
              />
            </Pressable>

            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, pageStyles.title]}>
                All Transactions
              </Text>
              <Text style={[styles.countText, pageStyles.subtitle]}>
                {visibleCount} transactions
              </Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={[styles.searchBar, pageStyles.searchBar]}>
              <Feather
                name="search"
                size={18}
                color={pageStyles.searchText.color}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search transactions..."
                placeholderTextColor={pageStyles.searchText.color}
                selectionColor={colors.primary}
                style={[
                  styles.searchInput,
                  { color: pageStyles.searchText.color },
                ]}
              />
            </View>

            <Pressable
              style={[
                styles.smallIconButton,
                pageStyles.iconButton,
                showTypeFilters && { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowTypeFilters((current) => !current)}
            >
              <Feather
                name="filter"
                size={18}
                color={showTypeFilters ? "#FFFFFF" : colors.foreground}
              />
            </Pressable>
            <Pressable
              style={[
                styles.smallIconButton,
                pageStyles.iconButton,
                selectedDate && { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowCalendar(true)}
            >
              <Feather
                name="calendar"
                size={18}
                color={selectedDate ? "#FFFFFF" : colors.foreground}
              />
            </Pressable>
          </View>

          {showTypeFilters ? (
            <View style={styles.filterRow}>
              {(["all", "income", "expense"] as const).map((option) => {
                const isActive = typeFilter === option;
                const label =
                  option === "all"
                    ? "All"
                    : option === "income"
                      ? "Income"
                      : "Expense";

                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.filterChip,
                      pageStyles.filterChip,
                      isActive && pageStyles.filterChipActive,
                    ]}
                    onPress={() => setTypeFilter(option)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        pageStyles.filterChipText,
                        isActive && pageStyles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, pageStyles.incomeCard]}>
              <Text style={styles.summaryLabelIncome}>Total Income</Text>
              <Text style={styles.summaryAmountIncome}>
                {formatCurrency(summary.income)}
              </Text>
            </View>
            <View style={[styles.summaryCard, pageStyles.expenseCard]}>
              <Text style={styles.summaryLabelExpense}>Total Expenses</Text>
              <Text style={styles.summaryAmountExpense}>
                {formatCurrency(summary.expenses)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.syncRow,
              {
                backgroundColor: isDark ? "#101722" : colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.08)",
              },
            ]}
          >
            <View style={styles.syncTextWrap}>
              <Text style={[styles.syncTitle, pageStyles.title]}>
                {syncLabel}
              </Text>
              <Text style={[styles.syncSubtitle, pageStyles.subtitle]}>
                {uiState === "offline"
                  ? "Changes will sync automatically when your connection returns."
                  : pendingCount
                    ? `${pendingCount} changes waiting to upload`
                    : "Your local data stays available offline."}
              </Text>
            </View>
            <Pressable
              style={[styles.syncButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                await Promise.all([refresh(), syncNow()]);
              }}
            >
              <Text style={styles.syncButtonText}>{isSyncing ? "..." : "Sync"}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.recordsScroll}
          contentContainerStyle={styles.recordsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || isSyncing}
              onRefresh={() =>
                Promise.all([refresh(), syncNow()]).catch(() => undefined)
              }
              tintColor={colors.primary}
            />
          }
        >
          {isLoading ? (
            <View
              style={[styles.emptyCard, pageStyles.groupCard, shadows.soft]}
            >
              <Text style={[styles.emptyTitle, pageStyles.title]}>
                Loading transactions
              </Text>
              <Text style={[styles.emptyText, pageStyles.subtitle]}>
                Fetching your latest transaction history.
              </Text>
            </View>
          ) : null}

          {!isLoading
            ? filteredSections.map((section) => (
                <View key={section.title} style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, pageStyles.sectionLabel]}>
                    {section.title}
                  </Text>

                  <View
                    style={[
                      styles.groupCard,
                      pageStyles.groupCard,
                      shadows.soft,
                    ]}
                  >
                    {section.items.map((item, index) => (
                      <View key={item.id}>
                        <Pressable
                          style={styles.recordRow}
                          onPress={() =>
                            router.push({
                              pathname: "/transaction-details-modal",
                              params: { transactionId: item.id },
                            })
                          }
                        >
                          <View style={styles.recordLeft}>
                            <View
                              style={[
                                styles.recordIconWrap,
                                {
                                  backgroundColor: isDark
                                    ? item.iconBackgroundDark
                                    : item.iconBackgroundLight,
                                },
                              ]}
                            >
                              {renderTransactionIcon(item)}
                            </View>

                            <View>
                              <Text
                                style={[styles.recordTitle, pageStyles.title]}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={[
                                  styles.recordCategory,
                                  pageStyles.subtitle,
                                ]}
                              >
                                {item.category}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.recordRight}>
                            <Text
                              style={[
                                styles.recordAmount,
                                item.amountColor === "income"
                                  ? pageStyles.incomeAmount
                                  : pageStyles.defaultAmount,
                              ]}
                            >
                              {item.signedAmountLabel}
                            </Text>
                            <Feather
                              name="chevron-right"
                              size={18}
                              color={pageStyles.chevron.color}
                            />
                          </View>
                        </Pressable>

                        {index < section.items.length - 1 ? (
                          <View
                            style={[styles.rowDivider, pageStyles.divider]}
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            : null}

          {!isLoading && !filteredSections.length ? (
            <View
              style={[styles.emptyCard, pageStyles.groupCard, shadows.soft]}
            >
              <Text style={[styles.emptyTitle, pageStyles.title]}>
                No transactions found
              </Text>
              <Text style={[styles.emptyText, pageStyles.subtitle]}>
                Try a different search, filter, or date.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {showCalendar ? (
          <View style={styles.calendarOverlay}>
            <Pressable
              style={styles.calendarBackdrop}
              onPress={() => setShowCalendar(false)}
            />
            <View
              style={[
                styles.calendarCard,
                pageStyles.calendarCard,
                shadows.card,
              ]}
            >
              <View style={styles.calendarHeader}>
                <Pressable
                  style={[styles.calendarArrow, pageStyles.searchBar]}
                  onPress={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() - 1,
                          1,
                        ),
                    )
                  }
                >
                  <Feather
                    name="chevron-left"
                    size={16}
                    color={pageStyles.calendarText.color}
                  />
                </Pressable>

                <Text style={[styles.calendarTitle, pageStyles.calendarText]}>
                  {monthNames[calendarMonth.getMonth()]}{" "}
                  {calendarMonth.getFullYear()}
                </Text>

                <Pressable
                  style={[styles.calendarArrow, pageStyles.searchBar]}
                  onPress={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() + 1,
                          1,
                        ),
                    )
                  }
                >
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={pageStyles.calendarText.color}
                  />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {weekdayLabels.map((label) => (
                  <Text
                    key={label}
                    style={[styles.weekdayLabel, pageStyles.mutedCalendarText]}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => {
                  const isSelected = selectedDate
                    ? isSameDay(day.date, selectedDate)
                    : false;
                  const isToday = isSameDay(day.date, new Date());

                  return (
                    <Pressable
                      key={day.key}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.primary },
                        !isSelected && isToday && styles.todayCell,
                        !isSelected && isToday && pageStyles.todayRing,
                      ]}
                      onPress={() => {
                        setSelectedDate(day.date);
                        setCalendarMonth(
                          new Date(
                            day.date.getFullYear(),
                            day.date.getMonth(),
                            1,
                          ),
                        );
                        setShowCalendar(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          pageStyles.calendarText,
                          !day.inMonth && pageStyles.dayOutsideText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {day.date.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.clearDateButton, pageStyles.filterChip]}
                onPress={() => {
                  setSelectedDate(null);
                  setShowCalendar(false);
                }}
              >
                <Text style={[styles.clearDateText, pageStyles.filterChipText]}>
                  Clear Date Filter
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
  },
  countText: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
  },
  searchRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  smallIconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  filterChip: {
    minWidth: 58,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  summaryRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  syncRow: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncTextWrap: {
    flex: 1,
  },
  syncTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  syncSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  syncButton: {
    minWidth: 64,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: fontWeights.bold,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 24,
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  summaryLabelIncome: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    color: "#00C665",
  },
  summaryAmountIncome: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: "#00C665",
  },
  summaryLabelExpense: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    color: "#FF1843",
  },
  summaryAmountExpense: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
    color: "#FF1843",
  },
  recordsScroll: {
    flex: 1,
    marginTop: 2,
  },
  recordsContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionBlock: {
    marginTop: 12,
  },
  emptyCard: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.bold,
  },
  emptyText: {
    marginTop: 6,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  sectionTitle: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  groupCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  recordRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recordLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  recordIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  recordTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  recordCategory: {
    marginTop: 2,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
  },
  recordRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordAmount: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  rowDivider: {
    marginLeft: 76,
    height: 1,
  },
  calendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
  weekdayRow: {
    marginTop: 14,
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  dayCell: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  todayCell: {
    borderWidth: 1,
  },
  dayLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  clearDateButton: {
    marginTop: 14,
    width: "100%",
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  clearDateText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    textAlign: "center",
  },
});
