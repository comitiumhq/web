import { ApiError } from '@comitium/schemas/api-errors';
import { useQuery } from '@tanstack/react-query';
import { useAuthClient } from './auth-context';
import { unwrapAuthResult } from './auth-result';
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
      const [session, accounts, passkeys] = await Promise.all([
        client.getSession(),
        client.listAccounts(),
        client.passkey.listUserPasskeys(),
      ]);

      const current = unwrapAuthResult(session);

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
    await auth.refetch();
    await query.refetch({ throwOnError: true });
  }

  return { methods: query.data, error: query.error, refreshMethods };
}
