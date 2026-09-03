import { PageLoader } from '@comitium/ui/page-loader';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export interface SessionRecoveryOptions {
  returnTo?: string;
}

export type RecoverSession = (options?: SessionRecoveryOptions) => Promise<boolean>;

interface SessionRecoveryProps {
  fallback?: ReactNode;
  recoverSession: RecoverSession;
  returnTo: string;
}

export function SessionRecovery({ fallback = <PageLoader />, recoverSession, returnTo }: SessionRecoveryProps) {
  useEffect(() => {
    recoverSession({ returnTo });
  }, [recoverSession, returnTo]);

  return <>{fallback}</>;
}
