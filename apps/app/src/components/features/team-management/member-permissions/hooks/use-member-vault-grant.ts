import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { useCallback } from 'react';
import { getOrgVaultAccess } from '@/lib/api/orgs-vault';
import { getPublicKey } from '@/lib/api/users';
import type { VaultGrant } from '@/lib/schemas/org-structure';

export function useEnsureMemberVaultGrant() {
  const { ensureUnlocked } = useCryptoUnlock();

  return useCallback(
    async (orgId: string, userId: string, memberHasVaultAccess: boolean): Promise<VaultGrant | undefined> => {
      if (memberHasVaultAccess) {
        return undefined;
      }

      const memberKey = await getPublicKey(userId);

      if (!memberKey) {
        throw new Error("This member's encryption setup must finish before they can be granted access.");
      }

      await ensureUnlocked();

      const ownAccess = await getOrgVaultAccess(orgId);
      const wrappedVaultKey = await CryptoProxy.grantVaultAccess(ownAccess, memberKey.publicKey, {
        recipientUserId: userId,
        recipientKeyVersion: memberKey.userKeyVersion,
      });

      return {
        wrappedVaultKey,
        vaultKeyVersion: ownAccess.vaultKeyVersion,
        recipientKeyVersion: memberKey.userKeyVersion,
      };
    },
    [ensureUnlocked],
  );
}
