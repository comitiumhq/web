import { createAuthAccountApi } from '@comitium/auth/account-api';
import { PrivyAppProvider } from '@comitium/auth/privy-app-provider';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { logger } from '@comitium/ui/logger';
import type { ReactNode } from 'react';
import { CryptoUnlockProvider } from '@/components/auth/crypto-unlock-provider';
import { EncryptionSetup } from '@/components/auth/encryption-setup';
import { qk } from '@/hooks/query-keys';
import { api, registerApiAuthTokenProvider } from '@/lib/api/client';

const authAccountApi = createAuthAccountApi(api);

function logWalletProvisioningError(message: string) {
  logger.warn('Canonical embedded wallet creation failed', { error: message });
}

export function CandidateProviders({ children }: { children: ReactNode }) {
  return (
    <PrivyAppProvider
      getSession={authAccountApi.getSession}
      sessionQueryKey={qk.auth.session}
      staleTime={STALE_TIME_DEFAULT}
      onWalletProvisioningError={logWalletProvisioningError}
      registerApiAuthTokenProvider={registerApiAuthTokenProvider}
    >
      <EncryptionSetup>
        <CryptoUnlockProvider>{children}</CryptoUnlockProvider>
      </EncryptionSetup>
    </PrivyAppProvider>
  );
}
