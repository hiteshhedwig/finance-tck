import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlRequest } from '../nhost/client';
import type { CCStatement } from '../../types';

const STMT_FIELDS = `
  id user_id account_id statement_date due_date
  total_amount paid_amount is_paid created_at
  account { id name color type }
`;

const GET_STATEMENTS = `
  query GetCCStatements($where: cc_statements_bool_exp!) {
    cc_statements(where: $where, order_by: { statement_date: desc }) {
      ${STMT_FIELDS}
    }
  }
`;

const MARK_PAID = `
  mutation MarkStatementPaid($id: uuid!) {
    update_cc_statements_by_pk(pk_columns: { id: $id }, _set: { is_paid: true }) {
      ${STMT_FIELDS}
    }
  }
`;

// Upsert using the unique constraint name from the schema:
// cc_statements_user_id_account_id_statement_date_key
const UPSERT_STATEMENT = `
  mutation UpsertCCStatement($object: cc_statements_insert_input!) {
    insert_cc_statements_one(
      object: $object
      on_conflict: {
        constraint: cc_statements_user_id_account_id_statement_date_key
        update_columns: [total_amount, due_date]
      }
    ) { ${STMT_FIELDS} }
  }
`;

const SUM_CC_TRANSACTIONS = `
  query SumCCTransactions($accountId: uuid!, $statementMonth: date!, $userId: uuid!) {
    transactions_aggregate(
      where: {
        user_id: { _eq: $userId }
        from_account_id: { _eq: $accountId }
        type: { _eq: expense }
        statement_month: { _eq: $statementMonth }
      }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

export function useCCStatements(userId: string | undefined, accountId?: string) {
  return useQuery<CCStatement[]>({
    queryKey: ['cc_statements', userId, accountId],
    enabled: !!userId,
    queryFn: async () => {
      const where: Record<string, unknown> = { user_id: { _eq: userId } };
      if (accountId) where.account_id = { _eq: accountId };

      const data = await gqlRequest<{ cc_statements: CCStatement[] }>(
        GET_STATEMENTS,
        { where }
      );
      return (data.cc_statements ?? []) as CCStatement[];
    },
  });
}

export function useMarkStatementPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      statementId,
      userId,
    }: {
      statementId: string;
      userId: string;
    }) => {
      const data = await gqlRequest<{ update_cc_statements_by_pk: CCStatement }>(
        MARK_PAID,
        { id: statementId }
      );
      return data.update_cc_statements_by_pk;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['cc_statements', vars.userId] });
    },
  });
}

export function useGenerateCCStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      accountId,
      statementDate,
      dueDate,
    }: {
      userId: string;
      accountId: string;
      statementDate: string;
      dueDate: string;
    }) => {
      // Sum all CC expenses belonging to this statement month
      const aggData = await gqlRequest<{
        transactions_aggregate: { aggregate: { sum: { amount: number | null } } };
      }>(SUM_CC_TRANSACTIONS, {
        accountId,
        statementMonth: statementDate,
        userId,
      });

      const total =
        aggData.transactions_aggregate.aggregate.sum.amount ?? 0;

      const data = await gqlRequest<{ insert_cc_statements_one: CCStatement }>(
        UPSERT_STATEMENT,
        {
          object: {
            user_id: userId,
            account_id: accountId,
            statement_date: statementDate,
            due_date: dueDate,
            total_amount: total,
          },
        }
      );
      return data.insert_cc_statements_one;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['cc_statements', vars.userId] });
    },
  });
}
