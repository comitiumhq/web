import type { FreshAuthenticationHandler, RecoveryCodeHandler, UnlockResult } from '@comitium/crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useConfirmFreshAuthentication } from '../fresh-authentication';
import { useCryptoUnlock } from '../use-crypto-unlock';
import { storageErrorMessage } from './storage-errors';

interface RecoveryConfirmation {
  resolve: () => void;
  reject: (error: Error) => void;
}

export function useStorageKeyAction() {
  const confirmFreshAuth = useConfirmFreshAuthentication();
  const { refreshAccount } = useCryptoUnlock();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const confirmation = useRef<RecoveryConfirmation | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const onRecoveryCode = useCallback<RecoveryCodeHandler>(
    (code) =>
      new Promise<void>((resolve, reject) => {
        if (!mounted.current) {
          reject(new DOMException('Storage action was closed', 'AbortError'));

          return;
        }

        confirmation.current = { resolve, reject };

        setRecoveryCode(code);
      }),
    [],
  );

  const confirmRecovery = useCallback(() => {
    setRecoveryConfirmed(true);

    confirmation.current?.resolve();
    confirmation.current = null;
  }, []);

  const cancelRecovery = useCallback(() => {
    confirmation.current?.reject(new DOMException('Recovery confirmation cancelled', 'AbortError'));
    confirmation.current = null;

    setRecoveryCode(null);
    setRecoveryConfirmed(false);
  }, []);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      confirmation.current?.reject(new DOMException('Storage action was closed', 'AbortError'));
      confirmation.current = null;
    };
  }, []);

  const run = useCallback(
    async (
      operation: (
        handler: RecoveryCodeHandler,
        confirmFreshAuth: FreshAuthenticationHandler,
      ) => Promise<UnlockResult | undefined>,
      keysChanged = false,
    ): Promise<boolean> => {
      if (busy.current) {
        return false;
      }

      busy.current = true;
      setPending(true);
      setError(null);

      try {
        const result = await operation(onRecoveryCode, confirmFreshAuth);

        await refreshAccount(keysChanged);

        if (result?.rememberedDevice === 'unavailable' || result?.rememberedDevice === 'cleanup_failed') {
          toast.warning('Your data is unlocked, but this device could not be remembered. Keep your password handy.');
        }

        return mounted.current;
      } catch (failure) {
        if (keysChanged) {
          await refreshAccount().catch(() => {});
        }

        if (mounted.current) {
          setError(storageErrorMessage(failure));
        }

        return false;
      } finally {
        busy.current = false;

        if (mounted.current) {
          setPending(false);
          setRecoveryCode(null);
          setRecoveryConfirmed(false);
        }
      }
    },
    [confirmFreshAuth, onRecoveryCode, refreshAccount],
  );

  return { run, pending, error, clearError, recoveryCode, recoveryConfirmed, confirmRecovery, cancelRecovery };
}
