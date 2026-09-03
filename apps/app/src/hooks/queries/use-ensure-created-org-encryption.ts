import { useSession } from '@comitium/auth/use-session';
import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { ensureOrgVault } from '@/lib/orgs';

export function useEnsureCreatedOrgEncryption(orgId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const canInitialize = orgId !== null && hasEncryptionKeyBundle(user);

  return useQuery({
    queryKey: qk.org.encryptionSetup(orgId),
    queryFn: canInitialize
      ? async () => {
          const result = await ensureOrgVault(orgId, user.publicKey);

          if (result.isErr()) {
            throw result.error;
          }

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: qk.orgs.my() }),
            queryClient.invalidateQueries({ queryKey: qk.org.vaultKey(orgId) }),
            queryClient.invalidateQueries({ queryKey: qk.org.vaultAccess(orgId) }),
          ]);

          return true;
        }
      : skipToken,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
