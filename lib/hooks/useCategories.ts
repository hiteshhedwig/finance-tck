import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '../nhost/client';
import type { Category } from '../../types';

const GET_CATEGORIES = `
  query GetCategories($userId: uuid!) {
    categories(
      where: { user_id: { _eq: $userId } }
      order_by: { name: asc }
    ) {
      id user_id name icon color is_system created_at
    }
  }
`;

export function useCategories(userId: string | undefined) {
  return useQuery<Category[]>({
    queryKey: ['categories', userId],
    enabled: !!userId,
    queryFn: async () => {
      const data = await gqlRequest<{ categories: Category[] }>(
        GET_CATEGORIES,
        { userId }
      );
      return data.categories ?? [];
    },
  });
}
