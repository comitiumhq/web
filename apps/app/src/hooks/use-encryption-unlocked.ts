import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { useCallback } from 'react';

interface EncryptionUnlockedResult {
  isUnlocked: boolean;
  requestUnlock: () => Promise<void>;
  runUnlocked: (action: () => void) => Promise<void>;
}

export function useEncryptionUnlocked(_orgId?: string): EncryptionUnlockedResult {
  const { isCryptoActive, requestUnlock } = useCryptoUnlock();

  const runUnlocked = useCallback(
    async (action: () => void) => {
      if (isCryptoActive) {
        action();

        return;
      }

      await requestUnlock();

      if (CryptoProxy.isActive()) {
        action();
      }
    },
    [isCryptoActive, requestUnlock],
  );

  return { isUnlocked: isCryptoActive, requestUnlock, runUnlocked };
}
