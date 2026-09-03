import { createAuthAccountApi } from '@comitium/auth/account-api';
import { useCryptoResetListener } from '@comitium/auth/use-crypto-reset-listener';
import { CryptoUnlockContext } from '@comitium/auth/use-crypto-unlock';
import { useIsCryptoActive } from '@comitium/auth/use-is-crypto-active';
import { useSession } from '@comitium/auth/use-session';
import { useAccount, useSignMessage } from '@comitium/auth/use-wallet';
import { normalizeAddress } from '@comitium/chain/address';
import { CryptoProxy } from '@comitium/crypto';
import type { WrappedPersonalKey } from '@comitium/schemas/auth';
import { logger } from '@comitium/ui/logger';
import { type ReactNode, useCallback, useEffect } from 'react';
import { useLogout } from '@/hooks/use-logout';
import { api } from '@/lib/api/client';
import { subscribeToCryptoReset } from '@/lib/crypto/crypto-reset';

const authAccountApi = createAuthAccountApi(api);

interface CryptoUnlockProviderProps {
  children: ReactNode;
}

function isActiveForUnlockTarget(
  wrappedPersonalKey: WrappedPersonalKey | null | undefined,
  address: string | null,
): boolean {
  if (!wrappedPersonalKey || !address) {
    return false;
  }

  return CryptoProxy.isActiveFor(wrappedPersonalKey, normalizeAddress(address));
}

export function CryptoUnlockProvider({ children }: CryptoUnlockProviderProps) {
  useCryptoResetListener(subscribeToCryptoReset);
  const { signMessage } = useSignMessage();
  const { address, wallet } = useAccount();
  const { user } = useSession();

  const resetOnIdentityChange = useLogout();
  const isAnyCryptoSessionActive = useIsCryptoActive();
  const normalizedAddress = address ? normalizeAddress(address) : null;
  const isCryptoActive = isActiveForUnlockTarget(user?.encryptedPersonalKey, normalizedAddress);
  const canUnlock = !!user?.encryptedPersonalKey && !!user?.publicKey && !!normalizedAddress;
  const hasCryptoIdentityMismatch = isAnyCryptoSessionActive && !isCryptoActive && canUnlock;

  useEffect(() => {
    if (!hasCryptoIdentityMismatch) {
      return;
    }

    resetOnIdentityChange({ returnTo: window.location.href });
  }, [hasCryptoIdentityMismatch, resetOnIdentityChange]);

  const ensureUnlocked = useCallback(async () => {
    if (isActiveForUnlockTarget(user?.encryptedPersonalKey, normalizedAddress)) {
      return;
    }

    if (hasCryptoIdentityMismatch) {
      throw new Error('Crypto session identity changed');
    }

    if (!user?.encryptedPersonalKey || !user?.publicKey || !normalizedAddress) {
      throw new Error('Cannot unlock crypto: user or wallet not ready');
    }

    await CryptoProxy.unlock(
      signMessage,
      user.encryptedPersonalKey,
      normalizedAddress,
      user.publicKey,
      authAccountApi.getUserKeyShare,
    );
  }, [hasCryptoIdentityMismatch, signMessage, user?.encryptedPersonalKey, user?.publicKey, normalizedAddress]);

  const requestUnlock = useCallback(async (): Promise<void> => {
    if (isActiveForUnlockTarget(user?.encryptedPersonalKey, normalizedAddress)) {
      return;
    }

    if (!wallet) {
      throw new Error('Canonical Privy wallet is not ready');
    }

    await ensureUnlocked();
  }, [user?.encryptedPersonalKey, normalizedAddress, ensureUnlocked, wallet]);

  useEffect(() => {
    if (
      isCryptoActive ||
      hasCryptoIdentityMismatch ||
      !wallet ||
      !user?.encryptedPersonalKey ||
      !user?.publicKey ||
      !normalizedAddress
    ) {
      return;
    }

    ensureUnlocked().catch((error: unknown) => {
      logger.warn('Automatic encryption unlock failed', { error, walletId: wallet?.id });
    });
  }, [
    isCryptoActive,
    hasCryptoIdentityMismatch,
    user?.encryptedPersonalKey,
    user?.publicKey,
    normalizedAddress,
    ensureUnlocked,
    wallet,
  ]);

  useEffect(
    () => () => {
      CryptoProxy.destroy();
    },
    [],
  );

  return (
    <CryptoUnlockContext.Provider
      value={{
        isCryptoActive,
        canUnlock,
        ensureUnlocked,
        requestUnlock,
      }}
    >
      {children}
    </CryptoUnlockContext.Provider>
  );
}
