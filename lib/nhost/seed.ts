import { gqlRequest } from './client';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../../constants';

const CHECK_ACCOUNTS = `
  query CheckAccounts($userId: uuid!) {
    accounts(where: { user_id: { _eq: $userId } }, limit: 1) { id }
  }
`;

const INSERT_ACCOUNTS = `
  mutation InsertAccounts($objects: [accounts_insert_input!]!) {
    insert_accounts(objects: $objects) { affected_rows }
  }
`;

const INSERT_CATEGORIES = `
  mutation InsertCategories($objects: [categories_insert_input!]!) {
    insert_categories(objects: $objects) { affected_rows }
  }
`;

export async function seedUserData(userId: string): Promise<void> {
  // Guard: skip if accounts already exist for this user
  const check = await gqlRequest<{ accounts: { id: string }[] }>(CHECK_ACCOUNTS, { userId });
  if (check.accounts.length > 0) return;

  await gqlRequest(INSERT_ACCOUNTS, {
    objects: DEFAULT_ACCOUNTS.map((a) => ({
      user_id: userId,
      name: a.name,
      type: a.type,
      color: a.color,
      icon: a.icon,
      balance: 0,
      statement_day: 'statement_day' in a ? a.statement_day : null,
      due_day: 'due_day' in a ? a.due_day : null,
    })),
  });

  await gqlRequest(INSERT_CATEGORIES, {
    objects: DEFAULT_CATEGORIES.map((c) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      is_system: true,
    })),
  });
}
