import { UnlockApiError } from '@comitium/crypto';
import type { IdentityClient } from './auth-client';
import { freshAuthSessionSchema } from './schemas/identity';

const FRESH_AUTH_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Read identity synchronously, including SDK changes before React renders again.
 */
export function getSessionUser(client: IdentityClient) {
  return client.$store.atoms.session.get().data?.user;
}

export async function hasFreshAuthentication(client: IdentityClient, userId: string): Promise<boolean> {
  const result = await client.getSession({ query: { disableCookieCache: true, disableRefresh: true } });

  if (result.error) {
    throw new UnlockApiError(result.error.status >= 400 ? result.error.status : 503);
  }

  const session = freshAuthSessionSchema.safeParse(result.data);

  if (!session.success || session.data.user.id !== userId) {
    throw new UnlockApiError(401);
  }

  const authenticatedAt = session.data.session.interactiveAuthenticatedAt?.getTime();

  if (authenticatedAt === undefined) {
    return false;
  }

  const age = Date.now() - authenticatedAt;

  return age >= 0 && age <= FRESH_AUTH_MAX_AGE_MS;
}
