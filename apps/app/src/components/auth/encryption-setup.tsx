import { EncryptionSetupGate } from '@comitium/auth/encryption-setup-gate';
import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export function EncryptionSetup({ children }: { children: ReactNode }) {
  const isSuppressed = useRouterState({
    select: (state) => {
      const path = state.location.pathname;

      return (
        path === '/invite' ||
        path === '/login' ||
        path === '/signup' ||
        path === '/account' ||
        path.startsWith('/account/')
      );
    },
  });

  return <EncryptionSetupGate isSuppressed={isSuppressed}>{children}</EncryptionSetupGate>;
}
