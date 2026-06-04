export const PAYLATERS_SUMMARY = {
  totalOutstanding: "₱3,850",
  activeCountLabel: "2 Active Paylaters",
  nextInstallment: "₱1,550",
  progressLabel: "50% paid off",
  progressRatio: 0.5,
} as const;

export const PAYLATERS_NEXT_DUE = {
  title: "Wireless Earbuds",
  amount: "₱750",
  dueInLabel: "11 days",
} as const;

export const PAYLATERS_ITEMS = [
  {
    id: "wireless-earbuds",
    title: "Wireless Earbuds",
    provider: "Shopee PayLater",
    status: "Upcoming",
    statusTone: "upcoming" as const,
    progressLabel: "50% paid • 3 installments remaining",
    progressRatio: 0.5,
    balance: "₱2,250",
    installment: "₱750",
    totalAmount: "₱4,500",
    dueDateLabel: "Day 15 of month",
    remainingInstallmentsLabel: "3 installments remaining",
    estimatedCompletionLabel: "Estimated completion: Sep 2026",
    paymentHistory: [
      {
        id: "wireless-earbuds-payment-1",
        dateLabel: "May 15, 2026",
        title: "Payment 1",
        amount: "₱750",
        deletable: true,
        amountFontSize: 14,
      },
      {
        id: "wireless-earbuds-payment-2",
        dateLabel: "Apr 15, 2026",
        title: "Payment 2",
        amount: "₱750",
        deletable: true,
        amountFontSize: 14,
      },
    ],
  },
  {
    id: "smart-watch",
    title: "Smart Watch",
    provider: "TikTok PayLater",
    status: "Overdue",
    statusTone: "overdue" as const,
    progressLabel: "50% paid • 2 installments remaining",
    progressRatio: 0.5,
    balance: "₱1,600",
    installment: "₱800",
    totalAmount: "₱3,200",
    dueDateLabel: "Day 22 of month",
    remainingInstallmentsLabel: "2 installments remaining",
    estimatedCompletionLabel: "Estimated completion: Aug 2026",
    paymentHistory: [
      {
        id: "smart-watch-payment-1",
        dateLabel: "May 22, 2026",
        title: "Payment 1",
        amount: "₱800",
        deletable: true,
        amountFontSize: 14,
      },
      {
        id: "smart-watch-payment-2",
        dateLabel: "Apr 22, 2026",
        title: "Payment 2",
        amount: "₱800",
        deletable: true,
        amountFontSize: 14,
      },
    ],
  },
] as const;

export type PaylaterRecord = (typeof PAYLATERS_ITEMS)[number];
