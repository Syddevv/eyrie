export type SettingsPaymentMethod = {
  id: string;
  kind: 'card' | 'wallet';
  brand: string;
  title: string;
  details: string;
  balance: string;
  color: string;
  isDefault: boolean;
  cardLabel?: string;
  cardNumber?: string;
  expiryDate?: string;
  phoneNumber?: string;
  statusText: string;
};

export const settingsPaymentMethods: readonly SettingsPaymentMethod[] = [
  {
    id: 'bpi-debit',
    kind: 'card',
    brand: 'VISA',
    title: 'BPI Debit Card',
    details: '**** 4521 • 12/26',
    balance: '₱25,000',
    color: '#2563EB',
    isDefault: true,
    cardLabel: 'DEBIT/CREDIT CARD',
    cardNumber: '**** 4521',
    expiryDate: '12/26',
    statusText: 'Default',
  },
  {
    id: 'bdo-credit',
    kind: 'card',
    brand: 'MC',
    title: 'BDO Credit Card',
    details: '**** 8832 • 08/27',
    balance: '₱50,000',
    color: '#F97316',
    isDefault: false,
    cardLabel: 'DEBIT/CREDIT CARD',
    cardNumber: '**** 8832',
    expiryDate: '08/27',
    statusText: 'Active',
  },
  {
    id: 'gcash',
    kind: 'wallet',
    brand: 'G',
    title: 'GCash',
    details: 'Connected',
    balance: '₱5,500',
    color: '#3B82F6',
    isDefault: false,
    phoneNumber: '+63 917 883 8832',
    statusText: 'Active',
  },
  {
    id: 'maya',
    kind: 'wallet',
    brand: 'M',
    title: 'Maya',
    details: 'Connected',
    balance: '₱3,200',
    color: '#22C55E',
    isDefault: false,
    phoneNumber: '+63 917 123 3200',
    statusText: 'Active',
  },
] as const;

export function getSettingsPaymentMethod(methodId?: string) {
  return settingsPaymentMethods.find((method) => method.id === methodId) ?? settingsPaymentMethods[0];
}
