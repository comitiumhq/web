import { UnlockApiError } from '@comitium/crypto';
import type { IdentityClient } from './auth-client';
import { unwrapAuthResult } from './auth-result';
import { identitySessionSchema } from './schemas/identity';

const FRESH_AUTH_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Read identity synchronously, including SDK changes before React renders again.
 */
export function getSessionUser(client: IdentityClient) {
  return client.$store.atoms.session.get().data?.user;
}

/** Wait for the SDK store: a background refresh can replace the requested fetch. */
export async function refreshIdentitySession(client: IdentityClient) {
  const store = client.$store.atoms.session;
  const session = await new Promise<ReturnType<typeof store.get>>((resolve, reject) => {
    const unsubscribe = store.listen((value) => {
      if (!value.isRefetching) {
        unsubscribe();
        resolve(value);
      }
    });

    void store
      .get()
      .refetch()
      .catch((error: unknown) => {
        unsubscribe();
        reject(error);
      });
  });

  return identitySessionSchema.nullable().parse(unwrapAuthResult(session));
}

export async function hasFreshAuthentication(client: IdentityClient, userId: string): Promise<boolean> {
  const result = await client.getSession({ query: { disableCookieCache: true, disableRefresh: true } });

  if (result.error) {
    throw new UnlockApiError(result.error.status >= 400 ? result.error.status : 503);
  }

  const session = identitySessionSchema.safeParse(result.data);

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
