import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { useCallback } from 'react';
import { getWrappedVaultKey } from '@/lib/api/orgs-vault';
import { getPublicKey } from '@/lib/api/users';
import type { VaultGrant } from '@/lib/schemas/org-structure';

export function useEnsureMemberVaultGrant() {
  const { ensureUnlocked } = useCryptoUnlock();

  return useCallback(
    async (orgId: string, walletAddress: string, memberHasVaultAccess: boolean): Promise<VaultGrant | undefined> => {
      if (memberHasVaultAccess) {
        return undefined;
      }

      const memberPublicKey = await getPublicKey(walletAddress);

      if (!memberPublicKey) {
        throw new Error("This member's encryption setup must finish before they can be granted access.");
      }

      await ensureUnlocked();
      const ownWrappedKey = await getWrappedVaultKey(orgId);
      const wrappedVaultKey = await CryptoProxy.grantVaultAccess(ownWrappedKey, memberPublicKey);

      return { wrappedVaultKey };
    },
    [ensureUnlocked],
  );
}
