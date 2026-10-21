import { ApiError } from '@comitium/schemas/api-errors';
import { useQuery } from '@tanstack/react-query';
import { useAuthClient } from './auth-context';
import { unwrapAuthResult } from './auth-result';
import { refreshIdentitySession } from './fresh-auth-session';
import { getLinkedSignInMethods } from './linked-sign-in-methods';
import { linkedAuthAccountsSchema, linkedPasskeysSchema } from './schemas/identity';

export function useSignInMethods(queryKey: (userId: string) => readonly unknown[]) {
  const client = useAuthClient();
  const auth = client.useSession();
  const userId = auth.data?.user.id ?? null;

  const query = useQuery({
    queryKey: queryKey(userId ?? ''),
    enabled: userId !== null,
    queryFn: async () => {
      const [current, accounts, passkeys] = await Promise.all([
        refreshIdentitySession(client),
        client.listAccounts(),
        client.passkey.listUserPasskeys(),
      ]);

      if (!current || current.user.id !== userId) {
        throw new ApiError(401, 'Authentication identity changed');
      }

      return getLinkedSignInMethods(
        current.user,
        linkedAuthAccountsSchema.parse(unwrapAuthResult(accounts)),
        linkedPasskeysSchema.parse(unwrapAuthResult(passkeys)),
      );
    },
  });

  async function refreshMethods() {
    await query.refetch({ throwOnError: true });
  }

  return { methods: query.data, error: query.error, refreshMethods };
}
