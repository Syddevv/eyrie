import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal";
import Logo from "@/components/logo";
import { useAccounts } from "@/hooks/useAccounts";
import { WALLETS } from "@/constants/wallets";
import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import { useTotalAssets } from "@/hooks/useTotalAssets";
import { formatCurrency } from "@/hooks/use-dashboard";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { accountsService } from "@/src/db/services";
import { useAuthStore } from "@/store/useAuthStore";

export default function PaymentMethodsModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const {
    accounts,
    hasResolved: accountsResolved,
    isInitialLoading: accountsInitialLoading,
    refresh,
  } = useAccounts();
  const {
    total,
    hasResolved: totalResolved,
    isInitialLoading: totalInitialLoading,
  } = useTotalAssets();
  const { showSnackbar } = useAuthStore();

  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !account.isHidden),
    [accounts],
  );
  const showAccountsEmptyState =
    accountsResolved && !accountsInitialLoading && visibleAccounts.length === 0;

  const resolveBrandName = (acct: any) => {
    const nameLower = (acct?.name || "").toLowerCase();

    // Try exact name matching (e.g., "MariBank" or "GCash")
    let matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );

    if (matchWallet) return matchWallet.name;

    // Try bank matching
    let matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );

    if (matchBank) return matchBank.name;

    // Try logo map key matching
    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return key.toUpperCase();

    // Fallback based on account type
    if (acct?.type === "ewallet") return "E-WALLET";
    if (acct?.type === "cash") return "CASH";
    if (acct?.type === "credit") return "Credit";

    return "Bank";
  };

  const resolveLogo = (acct: any) => {
    const nameLower = (acct?.name || "").toLowerCase();

    // Try exact name matching
    let matchWallet = WALLETS.find(
      (w) =>
        (w.name && nameLower.includes(w.name.toLowerCase())) ||
        (w.shortName && nameLower.includes(w.shortName.toLowerCase())) ||
        nameLower.includes(w.id),
    );
    if (matchWallet?.logo) return matchWallet.logo;

    // Try bank matching
    let matchBank = BANKS.find(
      (b) =>
        (b.name && nameLower.includes(b.name.toLowerCase())) ||
        (b.shortName && nameLower.includes(b.shortName.toLowerCase())) ||
        nameLower.includes(b.id),
    );
    if (matchBank?.logo) return matchBank.logo;

    // Try logo map key matching
    const key = nameLower.replace(/[^a-z0-9]/g, "");
    if (LOGO_MAP[key]) return LOGO_MAP[key];

    return undefined;
  };

  const accountToDelete = useMemo(
    () => visibleAccounts.find((a) => a.id === deletingAccountId),
    [visibleAccounts, deletingAccountId],
  );

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;

    setIsDeleting(true);
    try {
      await accountsService.delete(deletingAccountId);
      await refresh();
      setDeletingAccountId(null);
      showSnackbar("Account deleted successfully");
    } catch {
      showSnackbar("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark
          ? "rgba(2, 6, 23, 0.56)"
          : "rgba(15, 23, 42, 0.32)",
      },
      sheet: {
        backgroundColor: isDark ? "#111A27" : "#F4F8FC",
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15, 23, 42, 0.05)",
      },
      handle: {
        backgroundColor: isDark ? "#526173" : "#C9D3DF",
      },
      title: { color: isDark ? "#F8FAFC" : "#1A202C" },
      closeButton: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0.72)",
      },
      closeIcon: { color: isDark ? "#D4DCE6" : "#202733" },
      infoCard: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.12)" : "#DCEEFE",
        borderColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#B7D7FB",
      },
      infoText: { color: isDark ? "#607185" : "#607185" },
      methodCard: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.52)",
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "#E2E8F0",
      },
      methodTitle: { color: isDark ? "#F8FAFC" : "#111827" },
      methodDetails: { color: isDark ? "#A9B6C8" : "#6B7280" },
      methodBalance: { color: "#1C8CFF" },
      defaultPill: {
        backgroundColor: isDark ? "rgba(96, 165, 250, 0.18)" : "#D9ECFF",
      },
      defaultPillText: { color: "#1495FF" },
      chevron: { color: isDark ? "#A9B6C8" : "#6B7280" },
      addButton: {
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "#D0D7E2",
        backgroundColor: "transparent",
      },
      addButtonText: { color: isDark ? "#A9B6C8" : "#7A8596" },
    }),
    [isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Cards & Wallets</Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={[styles.infoCard, ui.infoCard]}>
            <View style={styles.infoAvatarFrame}>
              <Image
                contentFit="cover"
                source={require("@/assets/images/Eyrie_Mascot_3.png")}
                style={styles.infoAvatar}
              />
            </View>
            <Text style={[styles.infoText, ui.infoText]}>
              Your payment methods are securely stored and encrypted.
            </Text>
          </View>

          {/* Total assets */}
          <View style={[styles.methodCard, ui.methodCard]}>
            <View style={[styles.brandBubble, { backgroundColor: "#14B86A" }]}>
              <Text style={styles.brandText}>₱</Text>
            </View>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, ui.methodTitle]}>
                Total Assets
              </Text>
              <Text style={[styles.methodDetails, ui.methodDetails]}>
                All accounts combined
              </Text>
              <Text style={[styles.methodBalance, ui.methodBalance]}>
                {!totalResolved && totalInitialLoading
                  ? "---"
                  : formatCurrency(total)}
              </Text>
            </View>
            <View style={styles.methodRight}>
              <Feather
                name="chevron-right"
                size={18}
                color={ui.chevron.color}
              />
            </View>
          </View>

          {/* Account list from SQLite */}
          {showAccountsEmptyState ? (
            <View style={[styles.infoCard, ui.infoCard]}>
              <View style={styles.infoAvatarFrame}>
                <Image
                  contentFit="cover"
                  source={require("@/assets/images/Eyrie_Mascot_3.png")}
                  style={styles.infoAvatar}
                />
              </View>
              <Text style={[styles.infoText, ui.infoText]}>
                No accounts yet. Add your first bank, wallet, or cash account to
                get started.
              </Text>
            </View>
          ) : (
            visibleAccounts.map((acct) => (
              <View key={acct.id}>
                <Pressable
                  style={[
                    styles.methodCard,
                    ui.methodCard,
                    acct.type === "cash" && { opacity: 0.6 },
                  ]}
                  disabled={acct.type === "cash"}
                  onPress={() =>
                    router.replace({
                      pathname:
                        acct.type === "bank" || acct.type === "credit"
                          ? "/payment-card-details-modal"
                          : "/payment-wallet-details-modal",
                      params: { accountId: acct.id },
                    })
                  }
                >
                  <Logo
                    size={44}
                    logo={resolveLogo(acct)}
                    name={resolveBrandName(acct)}
                    backgroundColor={acct.color ?? "#6DB2EE"}
                    style={{ marginRight: 14 }}
                  />

                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodTitle, ui.methodTitle]}>
                      {resolveBrandName(acct)}
                    </Text>
                    <Text style={[styles.methodBalance, ui.methodBalance]}>
                      {formatCurrency(acct.balance ?? 0, acct.currencyCode)}
                    </Text>
                  </View>

                  <View style={styles.methodRight}>
                    {acct.type !== "cash" && (
                      <Pressable
                        style={[
                          styles.deleteButton,
                          {
                            backgroundColor: isDark
                              ? "rgba(255, 34, 63, 0.12)"
                              : "rgba(235, 58, 87, 0.08)",
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setDeletingAccountId(acct.id);
                        }}
                      >
                        <Feather name="trash-2" size={16} color="#FF5C73" />
                      </Pressable>
                    )}
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={
                        acct.type === "cash" ? "transparent" : ui.chevron.color
                      }
                    />
                  </View>
                </Pressable>
              </View>
            ))
          )}

          <Pressable
            style={[styles.addButton, ui.addButton]}
            onPress={() =>
              router.replace({
                pathname: "/add-payment-method-modal",
                params: { returnTo: "/payment-methods-modal" },
              })
            }
          >
            <Feather name="plus" size={18} color={ui.addButtonText.color} />
            <Text style={[styles.addButtonText, ui.addButtonText]}>
              Add Card or Wallet
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <DeleteConfirmationModal
        visible={deletingAccountId !== null}
        title={`Delete ${accountToDelete?.name}?`}
        message={`This ${accountToDelete?.type} account will be removed permanently. This action cannot be undone.`}
        isDeleting={isDeleting}
        onCancel={() => setDeletingAccountId(null)}
        onConfirm={handleDeleteAccount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "86%",
  },
  handle: {
    alignSelf: "center",
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    gap: 14,
    paddingBottom: 8,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoAvatarFrame: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  infoAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
  },
  infoText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  methodCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  brandBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  brandText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
    color: "#FFFFFF",
  },
  methodInfo: {
    flex: 1,
    paddingRight: 10,
    gap: 4,
  },
  methodTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  methodDetails: {
    marginTop: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeights.regular,
  },
  methodBalance: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.bold,
  },
  methodRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultPill: {
    minWidth: 58,
    height: 26,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultPillText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
  },
  addButton: {
    marginTop: 2,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.medium,
  },
});
