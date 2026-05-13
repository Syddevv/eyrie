import { useMemo } from "react";

import { BANKS } from "@/constants/banks";
import LOGO_MAP from "@/constants/logoMap";
import { WALLETS } from "@/constants/wallets";
import { useAccounts } from "@/hooks/useAccounts";
import { formatCurrency } from "@/hooks/use-dashboard";

export type PaymentMethodOption = {
  id: string;
  accountId?: string;
  kind: "bank" | "ewallet" | "cash" | "credit" | "virtual-cash";
  label: string;
  sublabel?: string;
  balance: number;
  balanceLabel: string;
  currencyCode?: string;
  createdAt: string;
  updatedAt: string;
  isFallback: boolean;
};

function formatLast4(value?: string | null) {
  return value?.trim() ? `•••• ${value.trim()}` : "";
}

function resolveBrandLabel(
  kind: PaymentMethodOption["kind"],
  name: string,
) {
  const nameLower = (name || "").toLowerCase();

  const matchWallet = WALLETS.find(
    (wallet) =>
      (wallet.name && nameLower.includes(wallet.name.toLowerCase())) ||
      (wallet.shortName && nameLower.includes(wallet.shortName.toLowerCase())) ||
      nameLower.includes(wallet.id),
  );
  if (matchWallet) {
    return matchWallet.name;
  }

  const matchBank = BANKS.find(
    (bank) =>
      (bank.name && nameLower.includes(bank.name.toLowerCase())) ||
      (bank.shortName && nameLower.includes(bank.shortName.toLowerCase())) ||
      nameLower.includes(bank.id),
  );
  if (matchBank) {
    return matchBank.name;
  }

  const key = nameLower.replace(/[^a-z0-9]/g, "");
  if (LOGO_MAP[key]) {
    return key.toUpperCase();
  }

  if (kind === "cash") {
    return name || "Cash";
  }

  if (kind === "ewallet") {
    return "E-Wallet";
  }

  if (kind === "credit") {
    return "Credit account";
  }

  return "Bank account";
}

function formatMethodLabel(
  kind: PaymentMethodOption["kind"],
  name: string,
  last4?: string | null,
) {
  const brandLabel = resolveBrandLabel(kind, name);

  if (kind === "bank" || kind === "credit") {
    const suffix = formatLast4(last4);
    return suffix ? `${brandLabel} ${suffix}` : brandLabel;
  }

  if (kind === "cash") {
    return brandLabel;
  }

  return brandLabel;
}

export function usePaymentMethods() {
  const { accounts, isLoading, refresh } = useAccounts();

  const methods = useMemo(() => {
    const visibleAccounts = accounts
      .filter((account) => !account.isHidden)
      .sort((left, right) => {
        const updatedAtDelta =
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime();
        if (updatedAtDelta !== 0) {
          return updatedAtDelta;
        }

        const balanceDelta =
          (Number(right.balance) || 0) - (Number(left.balance) || 0);
        if (balanceDelta !== 0) {
          return balanceDelta;
        }

        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      });

    if (!visibleAccounts.length) {
      return [
        {
          id: "cash-fallback",
          kind: "virtual-cash" as const,
          label: "Cash",
          sublabel: "Use cash",
          balance: 0,
          balanceLabel: formatCurrency(0),
          currencyCode: undefined,
          createdAt: "",
          updatedAt: "",
          isFallback: true,
        },
      ];
    }

    return visibleAccounts.map((account) => {
      const brandLabel = resolveBrandLabel(
        account.type as PaymentMethodOption["kind"],
        account.name,
      );
      const label = formatMethodLabel(
        account.type as PaymentMethodOption["kind"],
        account.name,
        account.accountNumberLast4,
      );

      const fallbackLabel =
        account.type === "cash"
          ? "Cash"
          : account.type === "ewallet"
            ? "E-Wallet"
            : account.type === "credit"
              ? "Credit account"
              : "Bank account";

      return {
        id: account.id,
        accountId: account.id,
        kind: account.type as PaymentMethodOption["kind"],
        label,
        sublabel: brandLabel ?? fallbackLabel,
        balance: Number(account.balance) || 0,
        balanceLabel: formatCurrency(
          Number(account.balance) || 0,
          account.currencyCode,
        ),
        currencyCode: account.currencyCode,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        isFallback: false,
      };
    });
  }, [accounts]);

  return { methods, isLoading, refresh } as const;
}
