import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlRequest } from '../nhost/client';
import type { Profile } from '../../types';

const GET_PROFILE = `
  query GetProfile($id: uuid!) {
    profiles_by_pk(id: $id) {
      id full_name salary_day default_month_mode created_at
    }
  }
`;

const UPSERT_PROFILE = `
  mutation UpsertProfile($profile: profiles_insert_input!) {
    insert_profiles_one(
      object: $profile
      on_conflict: {
        constraint: profiles_pkey
        update_columns: [full_name, salary_day, default_month_mode]
      }
    ) {
      id full_name salary_day default_month_mode created_at
    }
  }
`;

export function useProfile(userId: string | undefined) {
  return useQuery<Profile | null>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const data = await gqlRequest<{ profiles_by_pk: Profile | null }>(
        GET_PROFILE,
        { id: userId }
      );
      return data.profiles_by_pk;
    },
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<Profile> & { id: string }) => {
      const data = await gqlRequest<{ insert_profiles_one: Profile }>(
        UPSERT_PROFILE,
        { profile }
      );
      return data.insert_profiles_one;
    },
    onSuccess: (data) => {
      qc.setQueryData(['profile', data.id], data);
    },
  });
}
