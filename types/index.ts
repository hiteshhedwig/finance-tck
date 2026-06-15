export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'investment'
  | 'debt_payment'
  | 'cc_payment';

export type AccountType = 'bank' | 'cash' | 'credit_card';

export type PaymentMode =
  | 'upi'
  | 'bank_transfer'
  | 'cash'
  | 'credit_card'
  | 'neft'
  | 'imps';

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type MonthMode = 'salary_cycle' | 'calendar';

export interface Profile {
  id: string;
  full_name: string | null;
  salary_day: number;
  default_month_mode: MonthMode;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  notes: string | null;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  title: string;
  notes: string | null;
  date: string; // ISO date string 'YYYY-MM-DD'
  category_id: string | null;
  payment_mode: PaymentMode | null;
  from_account_id: string | null;
  to_account_id: string | null;
  statement_month: string | null; // 'YYYY-MM-DD' (first of statement month)
  is_recurring: boolean;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  from_account?: Account;
  to_account?: Account;
}

export interface CCStatement {
  id: string;
  user_id: string;
  account_id: string;
  statement_date: string; // 'YYYY-MM-DD'
  due_date: string;       // 'YYYY-MM-DD'
  total_amount: number;
  paid_amount: number;
  is_paid: boolean;
  created_at: string;
  // joined
  account?: Account;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  title: string;
  category_id: string | null;
  payment_mode: PaymentMode | null;
  from_account_id: string | null;
  to_account_id: string | null;
  interval: RecurrenceInterval;
  day_of_month: number | null;
  is_active: boolean;
  next_due: string | null;
  created_at: string;
}

// ---- helpers used across the app ----

export interface SalaryCycle {
  start: Date;
  end: Date;
  label: string; // e.g. "7 Mar – 6 Apr"
}

export interface DashboardSummary {
  income: number;
  expenses: number;
  investments: number;
  debtPayments: number;
  transfersOut: number;
  transfersIn: number;
  net: number;
}
