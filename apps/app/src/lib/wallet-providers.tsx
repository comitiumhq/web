import type { ReactNode } from 'react';

import { CryptoUnlockProvider } from '@/components/auth/crypto-unlock-provider';
import { EncryptionSetup } from '@/components/auth/encryption-setup';

export const WalletProviders = ({ children }: { children: ReactNode }) => {
  return (
    <EncryptionSetup>
      <CryptoUnlockProvider>{children}</CryptoUnlockProvider>
    </EncryptionSetup>
  );
};
