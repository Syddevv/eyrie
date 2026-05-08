export type HomePaymentMethod = {
  id: string;
  kind: 'card' | 'wallet';
  label: string;
  name: string;
  amount: string;
  digits?: string;
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
    kind: 'card',
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
    id: 'bdo-credit-card',
    kind: 'card',
    label: 'BACKUP CARD',
    name: 'BDO',
    amount: '₱18,920.40',
    digits: '8832',
    badgeColor: '#F97316',
    colors: ['#1F4FD8', '#2148C7', '#1C3EB0'],
    cardTypeLabel: 'CREDIT',
    accountName: 'BACKUP CARD',
    balance: '₱18,920.40',
    accountNumberLabel: '•••• 8832',
    detailType: 'Credit',
  },
  {
    id: 'gcash-e-wallet',
    kind: 'wallet',
    label: 'E-WALLET',
    name: 'GCash',
    amount: '₱5,234.00',
    badgeColor: 'rgba(255,255,255,0.18)',
    colors: ['#16B76D', '#0FA785', '#119E8D'],
    cardTypeLabel: 'E-WALLET',
    accountName: 'JUAN DELA CRUZ',
    balance: '₱5,234.00',
    accountNumberLabel: '+63 917 883 8832',
    detailType: 'E-Wallet',
  },
  {
    id: 'maya-e-wallet',
    kind: 'wallet',
    label: 'E-WALLET',
    name: 'Maya',
    amount: '₱3,200.00',
    badgeColor: 'rgba(255,255,255,0.18)',
    colors: ['#18B85A', '#12A94B', '#119043'],
    cardTypeLabel: 'E-WALLET',
    accountName: 'JUAN DELA CRUZ',
    balance: '₱3,200.00',
    accountNumberLabel: '+63 917 123 3200',
    detailType: 'E-Wallet',
  },
] as const;

export const homeCards = homePaymentMethods.filter((method) => method.kind === 'card');

export const homeWallets = homePaymentMethods.filter((method) => method.kind === 'wallet');

export function getHomePaymentMethod(methodId?: string) {
  return homePaymentMethods.find((method) => method.id === methodId) ?? homePaymentMethods[0];
}
