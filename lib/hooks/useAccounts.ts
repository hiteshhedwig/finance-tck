import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlRequest } from '../nhost/client';
import type { Account } from '../../types';

const ACCOUNT_FIELDS = `
  id user_id name type balance color icon is_active notes
  credit_limit statement_day due_day created_at
`;

const GET_ACCOUNTS = `
  query GetAccounts($userId: uuid!) {
    accounts(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
      order_by: { created_at: asc }
    ) { ${ACCOUNT_FIELDS} }
  }
`;

const INSERT_ACCOUNT = `
  mutation InsertAccount($object: accounts_insert_input!) {
    insert_accounts_one(object: $object) { ${ACCOUNT_FIELDS} }
  }
`;

const UPDATE_ACCOUNT = `
  mutation UpdateAccount($id: uuid!, $changes: accounts_set_input!) {
    update_accounts_by_pk(pk_columns: { id: $id }, _set: $changes) { ${ACCOUNT_FIELDS} }
  }
`;

// Atomic balance delta using Hasura's _inc operator (replaces supabase.rpc)
const INCREMENT_BALANCE = `
  mutation IncrementBalance($id: uuid!, $delta: numeric!) {
    update_accounts_by_pk(pk_columns: { id: $id }, _inc: { balance: $delta }) {
      id balance
    }
  }
`;

export function useAccounts(userId: string | undefined) {
  return useQuery<Account[]>({
    queryKey: ['accounts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const data = await gqlRequest<{ accounts: Account[] }>(GET_ACCOUNTS, { userId });
      return data.accounts ?? [];
    },
  });
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account: Partial<Account> & { user_id: string }) => {
      if (account.id) {
        const { id, user_id, created_at, ...changes } = account;
        const data = await gqlRequest<{ update_accounts_by_pk: Account }>(
          UPDATE_ACCOUNT,
          { id, changes }
        );
        return data.update_accounts_by_pk;
      } else {
        const data = await gqlRequest<{ insert_accounts_one: Account }>(
          INSERT_ACCOUNT,
          { object: account }
        );
        return data.insert_accounts_one;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['accounts', vars.user_id] });
    },
  });
}

/** Exported so useTransactions can call it directly (avoids hook nesting) */
export async function deltaBalance(accountId: string, delta: number): Promise<void> {
  try {
    await gqlRequest(INCREMENT_BALANCE, { id: accountId, delta });
  } catch (e: any) {
    console.error('[deltaBalance]', e.message);
  }
}
