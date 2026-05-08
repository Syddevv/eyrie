export type TransactionRecord = {
  id: string;
  sectionTitle: string;
  title: string;
  category: string;
  amount: string;
  amountColor: 'default' | 'income';
  type: 'Expense' | 'Income';
  dateLabel: string;
  iconLibrary: 'feather' | 'material';
  iconName: string;
  iconColor: string;
  iconBackgroundLight: string;
  iconBackgroundDark: string;
};

export const transactionRecords: readonly TransactionRecord[] = [
  {
    id: 'jollibee-today',
    sectionTitle: 'Today',
    title: 'Jollibee',
    category: 'Food & Dining',
    amount: '-₱450',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'Today, 12:30 PM',
    iconLibrary: 'material',
    iconName: 'silverware-fork-knife',
    iconColor: '#5B6475',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'salary-deposit-today',
    sectionTitle: 'Today',
    title: 'Salary Deposit',
    category: 'Income',
    amount: '+₱45,000',
    amountColor: 'income',
    type: 'Income',
    dateLabel: 'Today, 9:00 AM',
    iconLibrary: 'feather',
    iconName: 'arrow-down-left',
    iconColor: '#00A76F',
    iconBackgroundLight: '#CDEFE4',
    iconBackgroundDark: '#0D2B22',
  },
  {
    id: 'grab-ride-yesterday',
    sectionTitle: 'Yesterday',
    title: 'Grab Ride',
    category: 'Transportation',
    amount: '-₱285',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'Yesterday, 6:45 PM',
    iconLibrary: 'material',
    iconName: 'car-outline',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'netflix-yesterday',
    sectionTitle: 'Yesterday',
    title: 'Netflix',
    category: 'Entertainment',
    amount: '-₱549',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'Yesterday, 12:00 AM',
    iconLibrary: 'material',
    iconName: 'filmstrip-box-multiple',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'starbucks-may-5',
    sectionTitle: 'May 5',
    title: 'Starbucks',
    category: 'Food & Dining',
    amount: '-₱245',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'May 5, 8:15 AM',
    iconLibrary: 'material',
    iconName: 'coffee-outline',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'sm-store-may-5',
    sectionTitle: 'May 5',
    title: 'SM Store',
    category: 'Shopping',
    amount: '-₱2,350',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'May 5, 4:10 PM',
    iconLibrary: 'feather',
    iconName: 'shopping-bag',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'meralco-may-4',
    sectionTitle: 'May 4',
    title: 'Meralco',
    category: 'Bills',
    amount: '-₱3,200',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'May 4, 7:30 PM',
    iconLibrary: 'feather',
    iconName: 'zap',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
  {
    id: 'watsons-may-4',
    sectionTitle: 'May 4',
    title: 'Watsons',
    category: 'Health',
    amount: '-₱820',
    amountColor: 'default',
    type: 'Expense',
    dateLabel: 'May 4, 2:05 PM',
    iconLibrary: 'feather',
    iconName: 'heart',
    iconColor: '#7A8290',
    iconBackgroundLight: '#E9EDF3',
    iconBackgroundDark: '#181F2B',
  },
] as const;

export const transactionSections = Array.from(
  transactionRecords.reduce((map, transaction) => {
    const existing = map.get(transaction.sectionTitle);
    if (existing) {
      existing.push(transaction);
    } else {
      map.set(transaction.sectionTitle, [transaction]);
    }
    return map;
  }, new Map<string, TransactionRecord[]>())
).map(([title, items]) => ({ title, items }));

export function getTransactionRecord(transactionId?: string) {
  return transactionRecords.find((transaction) => transaction.id === transactionId) ?? transactionRecords[0];
}
