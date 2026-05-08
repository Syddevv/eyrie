export type HomePaymentMethod = {
  id: string;
  label: string;
  name: string;
  amount: string;
  digits: string;
  badgeColor: string;
  colors: readonly [string, string, string];
  cardTypeLabel: string;
  accountName: string;
  balance: string;
  accountNumberLabel: string;
  detailType: string;
};

export const homePaymentMethods: readonly HomePaymentMethod[] = [
  {
    id: 'bpi-main-account',
    label: 'MAIN ACCOUNT',
    name: 'BPI',
    amount: '₱45,250.75',
    digits: '4521',
    badgeColor: '#F7B400',
    colors: ['#3553D8', '#2A49CF', '#2445C9'],
    cardTypeLabel: 'DEBIT',
    accountName: 'MAIN ACCOUNT',
    balance: '₱45,250.75',
    accountNumberLabel: '•••• 4521',
    detailType: 'Debit',
  },
  {
    id: 'gcash-e-wallet',
    label: 'E-WALLET',
    name: 'GCash',
    amount: '₱5,234.00',
    digits: '8832',
    badgeColor: 'rgba(255,255,255,0.18)',
    colors: ['#16B76D', '#0FA785', '#119E8D'],
    cardTypeLabel: 'E-WALLET',
    accountName: 'JUAN DELA CRUZ',
    balance: '₱5,234.00',
    accountNumberLabel: '+63 917 883 8832',
    detailType: 'E-Wallet',
  },
] as const;

export function getHomePaymentMethod(methodId?: string) {
  return homePaymentMethods.find((method) => method.id === methodId) ?? homePaymentMethods[0];
}
