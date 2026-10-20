import { EncryptionSetupGate } from '@comitium/auth/encryption-setup-gate';
import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface EncryptionSetupProps {
  children: ReactNode;
}

export function EncryptionSetup({ children }: EncryptionSetupProps) {
  const boundary = useRouterState({
    select: (state) => {
      const path = state.location.pathname;

      return {
        isSuppressed:
          path === '/' ||
          path === '/invite' ||
          path === '/login' ||
          path === '/account' ||
          path.startsWith('/account/'),
        requireRecovery: path === '/org/create',
      };
    },
  });

  return <EncryptionSetupGate {...boundary}>{children}</EncryptionSetupGate>;
}
