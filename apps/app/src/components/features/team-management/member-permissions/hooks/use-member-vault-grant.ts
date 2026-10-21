import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { useCallback } from 'react';
import { getOrgVaultAccess } from '@/lib/api/orgs-vault';
import { getUserPublicKeyDescriptor } from '@/lib/api/users';
import type { VaultGrant } from '@/lib/schemas/org-structure';

export function useEnsureMemberVaultGrant() {
  const { ensureUnlocked } = useCryptoUnlock();

  return useCallback(
    async (orgId: string, userId: string, memberHasVaultAccess: boolean): Promise<VaultGrant | undefined> => {
      if (memberHasVaultAccess) {
        return undefined;
      }

      const memberKeyDescriptor = await getUserPublicKeyDescriptor(userId);

      if (!memberKeyDescriptor) {
        throw new Error("This member's encryption setup must finish before they can be granted access.");
      }

      await ensureUnlocked();

      const ownAccess = await getOrgVaultAccess(orgId);
      const wrappedVaultKey = await CryptoProxy.grantVaultAccess(ownAccess, memberKeyDescriptor.publicKey, {
        recipientUserId: userId,
        recipientKeyVersion: memberKeyDescriptor.userKeyVersion,
      });

      return {
        wrappedVaultKey,
        vaultKeyVersion: ownAccess.vaultKeyVersion,
        recipientKeyVersion: memberKeyDescriptor.userKeyVersion,
      };
    },
    [ensureUnlocked],
  );
}
