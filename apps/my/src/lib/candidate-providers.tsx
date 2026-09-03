import { createAuthAccountApi } from '@comitium/auth/account-api';
import { PrivyAppProvider } from '@comitium/auth/privy-app-provider';
import {
  registerUserWalletAuthorizationSignatureProvider,
  registerUserWalletOperationTransport,
} from '@comitium/auth/user-wallet-operation';
import { registerOnchainOperationTransport } from '@comitium/chain/onchain-operation-observer';
import { isTransientApiError } from '@comitium/schemas/api-errors';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { logger } from '@comitium/ui/logger';
import { type ReactNode, useEffect } from 'react';
import { CryptoUnlockProvider } from '@/components/auth/crypto-unlock-provider';
import { EncryptionSetup } from '@/components/auth/encryption-setup';
import { qk } from '@/hooks/query-keys';
import { api, registerApiAuthTokenProvider } from '@/lib/api/client';
import { getOnchainOperationStatus, submitUserWalletTransaction } from '@/lib/api/onchain-operations';

const authAccountApi = createAuthAccountApi(api);

function logWalletProvisioningError(message: string) {
  logger.warn('Canonical embedded wallet creation failed', { error: message });
}

function OnchainOperationTransportBridge() {
  useEffect(() => {
    const unregisterObserver = registerOnchainOperationTransport({
      getStatus: getOnchainOperationStatus,
      isTransientError: isTransientApiError,
    });
    const unregisterWalletTransport = registerUserWalletOperationTransport(submitUserWalletTransaction);

    return () => {
      unregisterObserver();
      unregisterWalletTransport();
    };
  }, []);

  return null;
}

export function CandidateProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <OnchainOperationTransportBridge />
      <PrivyAppProvider
        getSession={authAccountApi.getSession}
        sessionQueryKey={qk.auth.session}
        staleTime={STALE_TIME_DEFAULT}
        onWalletProvisioningError={logWalletProvisioningError}
        registerApiAuthTokenProvider={registerApiAuthTokenProvider}
        registerWalletAuthorizationProvider={registerUserWalletAuthorizationSignatureProvider}
      >
        <EncryptionSetup>
          <CryptoUnlockProvider>{children}</CryptoUnlockProvider>
        </EncryptionSetup>
      </PrivyAppProvider>
    </>
  );
}
