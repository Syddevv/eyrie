import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Logo from "../components/logo";
import { WALLETS } from "@/constants/wallets";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { showIncompleteFormAlert } from "@/lib/utils/form-feedback";

export default function AddEWalletMethodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    parentTo?: string | string[];
    selectedWallet?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  const returnTo =
    (Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo) ||
    "/payment-methods-modal";
  const parentTo =
    (Array.isArray(params.parentTo) ? params.parentTo[0] : params.parentTo) ||
    "/payment-methods-modal";
  const selectedWalletParam = Array.isArray(params.selectedWallet)
    ? params.selectedWallet[0]
    : params.selectedWallet;

  const [selectedWallet, setSelectedWallet] = useState<string | null>(
    selectedWalletParam || null,
  );
  // No search field: show curated wallets list
  const visibleWallets = WALLETS;

  const isContinueEnabled = Boolean(selectedWallet);

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
      backText: { color: isDark ? "#A9B6C8" : "#6B7280" },
      sectionTitle: { color: isDark ? "#F8FAFC" : "#1F2937" },
      walletCard: {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.5)",
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#DCE4EE",
      },
      walletCardSelected: {
        borderColor: "#60A5FA",
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.5)",
      },
      walletText: { color: isDark ? "#F8FAFC" : "#202733" },
      button: { backgroundColor: "#6DB2EE" },
      buttonDisabled: { backgroundColor: isDark ? "#31577D" : "#A9CDED" },
      buttonText: { color: "#FFFFFF" },
    }),
    [isDark],
  );

  return (
    <View style={[styles.overlay, ui.overlay]}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={[styles.sheet, ui.sheet, shadows.floating]}>
        <View style={[styles.handle, ui.handle]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, ui.title]}>Add Wallet</Text>
          <Pressable
            style={[styles.closeButton, ui.closeButton]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={ui.closeIcon.color} />
          </Pressable>
        </View>

        <Pressable
          style={styles.backRow}
          onPress={() =>
            router.replace({
              pathname: returnTo as any,
              params: { returnTo: parentTo },
            })
          }
        >
          <Feather name="chevron-left" size={18} color={ui.backText.color} />
          <Text style={[styles.backText, ui.backText]}>Back</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, ui.sectionTitle]}>
          Select your e-wallet
        </Text>

        {/* Search removed: curated wallet list below */}

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.walletGridWrap}
        >
          {visibleWallets.map((wallet) => {
            const isSelected = wallet.id === selectedWallet;

            return (
              <Pressable
                key={wallet.id}
                style={[
                  styles.walletCard,
                  ui.walletCard,
                  isSelected && ui.walletCardSelected,
                  isSelected && styles.walletCardActive,
                ]}
                onPress={() => setSelectedWallet(wallet.id)}
              >
                <Logo
                  id={wallet.id}
                  name={wallet.name}
                  shortName={wallet.shortName}
                  size={36}
                  backgroundColor={wallet.primaryColor}
                />

                <Text
                  style={[styles.walletText, ui.walletText]}
                  numberOfLines={2}
                >
                  {wallet.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={[
            styles.continueButton,
            isContinueEnabled ? ui.button : ui.buttonDisabled,
          ]}
          onPress={() => {
            if (!isContinueEnabled || !selectedWallet) {
              showIncompleteFormAlert();
              return;
            }

            router.replace({
              pathname: "/add-e-wallet-account-modal",
              params: {
                returnTo: "/add-e-wallet-method-modal",
                parentTo,
                selectedWallet,
              },
            });
          }}
        >
          <Text style={[styles.continueButtonText, ui.buttonText]}>
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: "82%",
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
  backRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
  },
  backText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  sectionTitle: {
    marginTop: 18,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  searchInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: "transparent",
    fontFamily: fontFamilies.sans,
    fontSize: 14,
  },
  walletGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  walletCard: {
    width: "48%",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletCardActive: {
    borderColor: "#60A5FA",
  },
  walletText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  continueButton: {
    marginTop: 8,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
