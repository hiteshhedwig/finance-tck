// Design tokens
export const Colors = {
  background: '#0F0F14',
  surface: '#1A1A24',
  surfaceElevated: '#22222F',
  border: '#2A2A38',
  borderLight: '#32324A',

  text: '#F0F0F8',
  textSecondary: '#8888AA',
  textMuted: '#55556A',

  primary: '#6B7FFF',
  primaryMuted: '#6B7FFF22',
  success: '#4CAF7D',
  successMuted: '#4CAF7D22',
  danger: '#F26D6D',
  dangerMuted: '#F26D6D22',
  warning: '#F0A500',
  warningMuted: '#F0A50022',
  purple: '#A78BFA',
  purpleMuted: '#A78BFA22',

  income: '#4CAF7D',
  expense: '#F26D6D',
  transfer: '#60A5FA',
  investment: '#A78BFA',
  debt: '#F0A500',
  ccPayment: '#60A5FA',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

// Domain constants
export const DEFAULT_SALARY_DAY = 7;
export const DEFAULT_CC_STATEMENT_DAY = 1;
export const DEFAULT_CC_DUE_DAY = 21;

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  investment: 'Investment',
  debt_payment: 'Loan / EMI',
  cc_payment: 'CC Payment',
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  credit_card: 'Credit Card',
  neft: 'NEFT',
  imps: 'IMPS',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Account',
  cash: 'Cash',
  credit_card: 'Credit Card',
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  income: Colors.income,
  expense: Colors.expense,
  transfer: Colors.transfer,
  investment: Colors.investment,
  debt_payment: Colors.debt,
  cc_payment: Colors.ccPayment,
};

// Default accounts to seed for new users
export const DEFAULT_ACCOUNTS = [
  { name: 'HDFC Master', type: 'bank', color: '#4CAF7D', icon: 'bank' },
  { name: 'SBI', type: 'bank', color: '#60A5FA', icon: 'bank' },
  { name: 'Federal Bank', type: 'bank', color: '#A78BFA', icon: 'bank' },
  { name: 'Cash', type: 'cash', color: '#F0A500', icon: 'cash' },
  {
    name: 'Credit Card',
    type: 'credit_card',
    color: '#F26D6D',
    icon: 'credit-card',
    statement_day: 1,
    due_day: 21,
  },
] as const;

// Default categories
export const DEFAULT_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#4CAF7D' },
  { name: 'Food & Dining', icon: 'restaurant', color: '#FF7043' },
  { name: 'Groceries', icon: 'cart', color: '#8BC34A' },
  { name: 'Transport', icon: 'car', color: '#26C6DA' },
  { name: 'Bills & Utilities', icon: 'lightning', color: '#FFA726' },
  { name: 'Shopping', icon: 'bag', color: '#EC407A' },
  { name: 'Health', icon: 'heart', color: '#EF5350' },
  { name: 'Entertainment', icon: 'play', color: '#AB47BC' },
  { name: 'Travel', icon: 'airplane', color: '#42A5F5' },
  { name: 'Subscriptions', icon: 'refresh', color: '#7E57C2' },
  { name: 'Personal Care', icon: 'person', color: '#F48FB1' },
  { name: 'Family Support', icon: 'people', color: '#66BB6A' },
  { name: 'Loan EMI', icon: 'calendar', color: '#FF7043' },
  { name: 'Investments', icon: 'trending-up', color: '#A78BFA' },
  { name: 'Cash Withdrawal', icon: 'cash', color: '#90A4AE' },
  { name: 'Miscellaneous', icon: 'ellipsis', color: '#78909C' },
] as const;
