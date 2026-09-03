import { SessionRecovery } from '@comitium/auth/session-recovery';
import type { ReactNode } from 'react';
import { useLogout } from '@/hooks/use-logout';

interface AuthSessionRecoveryProps {
  fallback?: ReactNode;
  returnTo?: string;
}

export function AuthSessionRecovery({ fallback, returnTo = '/' }: AuthSessionRecoveryProps) {
  const recoverSession = useLogout();

  return <SessionRecovery fallback={fallback} recoverSession={recoverSession} returnTo={returnTo} />;
}
