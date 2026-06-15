import { createClient, withClientSideSessionMiddleware } from '@nhost/nhost-js';
import { storageBackend } from './storage';

/**
 * Call this once in the root layout before rendering anything.
 * Loads the persisted session into the in-memory cache so
 * nhost.getUserSession() returns the correct value on first read.
 */
export async function initializeNhostStorage(): Promise<void> {
  await storageBackend.initialize();
}

const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN as string;
const region = process.env.EXPO_PUBLIC_NHOST_REGION as string;

if (!subdomain || !region) {
  console.warn(
    '[Nhost] Missing env vars. Set EXPO_PUBLIC_NHOST_SUBDOMAIN and EXPO_PUBLIC_NHOST_REGION in .env'
  );
}

export const nhost = createClient({
  subdomain: subdomain ?? 'local',
  region: region ?? 'local',
  storage: storageBackend,
  configure: [withClientSideSessionMiddleware],
});

/**
 * Helper that unwraps the double-wrapped Nhost GraphQL response.
 * Throws on both HTTP errors (FetchError thrown by SDK) and GraphQL errors
 * (status 200 but errors[] in body).
 */
export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // FetchResponse<GraphQLResponse<T>> shape: result.body = { data, errors }
  const result = await nhost.graphql.request<T>({ query, variables });
  const gqlResponse = result.body;
  if (gqlResponse.errors?.length) {
    throw new Error(gqlResponse.errors[0]?.message ?? 'GraphQL error');
  }
  if (gqlResponse.data == null) {
    throw new Error('No data in GraphQL response');
  }
  return gqlResponse.data;
}
