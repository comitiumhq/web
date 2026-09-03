import { createAuthAccountApi } from '@comitium/auth/account-api';
import { EncryptionSetupGate } from '@comitium/auth/encryption-setup-gate';
import { useEncryptionSetup } from '@comitium/auth/use-encryption-setup';
import type { ReactNode } from 'react';

import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

const authAccountApi = createAuthAccountApi(api);

export function EncryptionSetup({ children }: { children: ReactNode }) {
  const encryptionSetup = useEncryptionSetup({
    getUserKeyShare: authAccountApi.getUserKeyShare,
    initializeEncryptionKeyBundle: authAccountApi.initializeEncryptionKeyBundle,
    sessionQueryKey: qk.auth.sessionRoot(),
  });

  return (
    <EncryptionSetupGate error={encryptionSetup.error} initializeEncryptionKeyBundle={encryptionSetup.mutateAsync}>
      {children}
    </EncryptionSetupGate>
  );
}
