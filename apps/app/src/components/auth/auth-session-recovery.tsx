import { SessionRecovery, useRecoverSession } from '@comitium/auth/session-recovery';
import type { ReactNode } from 'react';

interface AuthSessionRecoveryProps {
  fallback?: ReactNode;
  returnTo?: string;
}

export function AuthSessionRecovery({ fallback, returnTo = '/' }: AuthSessionRecoveryProps) {
  const recoverSession = useRecoverSession();

  return <SessionRecovery fallback={fallback} recoverSession={recoverSession} returnTo={returnTo} />;
}
