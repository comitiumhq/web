import { CryptoProxy } from '@comitium/crypto';
import { PageLoader } from '@comitium/ui/page-loader';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';

export interface SessionRecoveryOptions {
  returnTo?: string;
}

export type RecoverSession = (options?: SessionRecoveryOptions) => Promise<boolean>;

export function useRecoverSession(): RecoverSession {
  const queryClient = useQueryClient();

  return useCallback(
    async ({ returnTo = '/' }: SessionRecoveryOptions = {}) => {
      try {
        await CryptoProxy.clear();
      } catch {
        await CryptoProxy.destroy();
      } finally {
        queryClient.clear();
        window.location.replace(returnTo);
      }

      return true;
    },
    [queryClient],
  );
}

interface SessionRecoveryProps {
  fallback?: ReactNode;
  recoverSession: RecoverSession;
  returnTo: string;
}

export function SessionRecovery({ fallback = <PageLoader />, recoverSession, returnTo }: SessionRecoveryProps) {
  useEffect(() => {
    void recoverSession({ returnTo });
  }, [recoverSession, returnTo]);

  return <>{fallback}</>;
}
