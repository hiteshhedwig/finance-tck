import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlRequest } from '../nhost/client';
import { deltaBalance } from './useAccounts';
import { getCCStatementCycle } from '../utils/cycle';
import type { Transaction, TransactionType, PaymentMode } from '../../types';
import { format } from 'date-fns';

// Relationship names must match what you configure in Hasura console:
//   category      → transactions.category_id → categories
//   from_account  → transactions.from_account_id → accounts
//   to_account    → transactions.to_account_id → accounts
const TXN_FIELDS = `
  id user_id type amount title notes date
  category_id payment_mode from_account_id to_account_id
  statement_month is_recurring recurring_id created_at updated_at
  category { id name icon color }
  from_account { id name color type }
  to_account { id name color type }
`;

const GET_TRANSACTIONS = `
  query GetTransactions($where: transactions_bool_exp!, $limit: Int) {
    transactions(
      where: $where
      order_by: [{ date: desc }, { created_at: desc }]
      limit: $limit
    ) { ${TXN_FIELDS} }
  }
`;

const INSERT_TRANSACTION = `
  mutation InsertTransaction($object: transactions_insert_input!) {
    insert_transactions_one(object: $object) {
      id user_id type amount title notes date category_id payment_mode
      from_account_id to_account_id statement_month is_recurring recurring_id
      created_at updated_at
    }
  }
`;

const GET_TRANSACTION_BY_ID = `
  query GetTransactionById($id: uuid!) {
    transactions_by_pk(id: $id) {
      id user_id type amount title notes date category_id payment_mode
      from_account_id to_account_id statement_month is_recurring recurring_id
      created_at updated_at
    }
  }
`;

const DELETE_TRANSACTION = `
  mutation DeleteTransaction($id: uuid!) {
    delete_transactions_by_pk(id: $id) { id }
  }
`;

interface TransactionFilters {
  userId: string;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  paymentMode?: PaymentMode;
  search?: string;
}

function buildWhere(filters: TransactionFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {
    user_id: { _eq: filters.userId },
  };

  // Date range
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, string> = {};
    if (filters.startDate) dateFilter._gte = filters.startDate;
    if (filters.endDate) dateFilter._lte = filters.endDate;
    where.date = dateFilter;
  }

  if (filters.type) where.type = { _eq: filters.type };
  if (filters.categoryId) where.category_id = { _eq: filters.categoryId };
  if (filters.paymentMode) where.payment_mode = { _eq: filters.paymentMode };
  if (filters.search) where.title = { _ilike: `%${filters.search}%` };

  // OR filter for account: either from or to
  if (filters.accountId) {
    where._or = [
      { from_account_id: { _eq: filters.accountId } },
      { to_account_id: { _eq: filters.accountId } },
    ];
  }

  return where;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    enabled: !!filters.userId,
    queryFn: async () => {
      const data = await gqlRequest<{ transactions: Transaction[] }>(
        GET_TRANSACTIONS,
        { where: buildWhere(filters) }
      );
      return (data.transactions ?? []) as Transaction[];
    },
  });
}

interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  amount: number;
  title: string;
  notes?: string;
  date: string;
  categoryId?: string;
  paymentMode?: PaymentMode;
  fromAccountId?: string;
  toAccountId?: string;
  isRecurring?: boolean;
  recurringId?: string;
  ccStatementDay?: number;
  ccDueDay?: number;
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      let statementMonth: string | null = null;
      if (input.paymentMode === 'credit_card' && input.type === 'expense') {
        const { statementMonth: sm } = getCCStatementCycle(
          new Date(input.date),
          input.ccStatementDay ?? 1,
          input.ccDueDay ?? 21
        );
        statementMonth = sm;
      }

      const object = {
        user_id: input.userId,
        type: input.type,
        amount: input.amount,
        title: input.title,
        notes: input.notes ?? null,
        date: input.date,
        category_id: input.categoryId ?? null,
        payment_mode: input.paymentMode ?? null,
        from_account_id: input.fromAccountId ?? null,
        to_account_id: input.toAccountId ?? null,
        statement_month: statementMonth,
        is_recurring: input.isRecurring ?? false,
        recurring_id: input.recurringId ?? null,
      };

      const data = await gqlRequest<{ insert_transactions_one: Transaction }>(
        INSERT_TRANSACTION,
        { object }
      );

      await applyBalanceChanges(input);

      return data.insert_transactions_one;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts', vars.userId] });
      qc.invalidateQueries({ queryKey: ['cc_statements'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transactionId,
      userId,
    }: {
      transactionId: string;
      userId: string;
    }) => {
      // Fetch transaction first to reverse balance
      const fetched = await gqlRequest<{ transactions_by_pk: Transaction | null }>(
        GET_TRANSACTION_BY_ID,
        { id: transactionId }
      );
      const txn = fetched.transactions_by_pk;
      if (!txn) throw new Error('Transaction not found');

      await reverseBalanceChanges(txn);

      await gqlRequest(DELETE_TRANSACTION, { id: transactionId });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts', vars.userId] });
    },
  });
}

const UPDATE_TRANSACTION = `
  mutation UpdateTransaction($id: uuid!, $changes: transactions_set_input!) {
    update_transactions_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id user_id type amount title notes date category_id payment_mode
      from_account_id to_account_id statement_month is_recurring recurring_id
      created_at updated_at
    }
  }
`;

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      oldTxn,
      newInput,
    }: {
      oldTxn: Transaction;
      newInput: CreateTransactionInput;
    }) => {
      // Reverse old balance
      await reverseBalanceChanges(oldTxn);

      // Compute statement month
      let statementMonth: string | null = null;
      if (newInput.paymentMode === 'credit_card' && newInput.type === 'expense') {
        const { statementMonth: sm } = getCCStatementCycle(
          new Date(newInput.date),
          newInput.ccStatementDay ?? 1,
          newInput.ccDueDay ?? 21
        );
        statementMonth = sm;
      }

      const changes = {
        type: newInput.type,
        amount: newInput.amount,
        title: newInput.title,
        notes: newInput.notes ?? null,
        date: newInput.date,
        category_id: newInput.categoryId ?? null,
        payment_mode: newInput.paymentMode ?? null,
        from_account_id: newInput.fromAccountId ?? null,
        to_account_id: newInput.toAccountId ?? null,
        statement_month: statementMonth,
      };

      await gqlRequest(UPDATE_TRANSACTION, { id: oldTxn.id, changes });

      // Apply new balance
      await applyBalanceChanges(newInput);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['accounts', vars.newInput.userId] });
      qc.invalidateQueries({ queryKey: ['transaction', vars.oldTxn.id] });
    },
  });
}

// ------- balance helpers -------

async function applyBalanceChanges(input: CreateTransactionInput) {
  const { type, amount, fromAccountId, toAccountId, paymentMode } = input;

  switch (type) {
    case 'income':
      if (fromAccountId) await deltaBalance(fromAccountId, amount);
      break;
    case 'expense':
      if (fromAccountId) await deltaBalance(fromAccountId, -amount);
      break;
    case 'transfer':
      if (fromAccountId) await deltaBalance(fromAccountId, -amount);
      if (toAccountId) await deltaBalance(toAccountId, amount);
      break;
    case 'investment':
    case 'debt_payment':
      if (fromAccountId) await deltaBalance(fromAccountId, -amount);
      break;
    case 'cc_payment':
      if (fromAccountId) await deltaBalance(fromAccountId, -amount);
      if (toAccountId) await deltaBalance(toAccountId, amount);
      break;
  }
}

async function reverseBalanceChanges(txn: Transaction) {
  const { type, amount, from_account_id, to_account_id } = txn;

  switch (type) {
    case 'income':
      if (from_account_id) await deltaBalance(from_account_id, -amount);
      break;
    case 'expense':
      if (from_account_id) await deltaBalance(from_account_id, amount);
      break;
    case 'transfer':
      if (from_account_id) await deltaBalance(from_account_id, amount);
      if (to_account_id) await deltaBalance(to_account_id, -amount);
      break;
    case 'investment':
    case 'debt_payment':
      if (from_account_id) await deltaBalance(from_account_id, amount);
      break;
    case 'cc_payment':
      if (from_account_id) await deltaBalance(from_account_id, amount);
      if (to_account_id) await deltaBalance(to_account_id, -amount);
      break;
  }
}
