import { hasEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { PageLoader } from '@comitium/ui/page-loader';
import { type ReactNode, useEffect, useRef } from 'react';

import { useSession } from './use-session';
import { useActiveWallet } from './use-wallet';

interface EncryptionSetupGateProps {
  children: ReactNode;
  error: Error | null;
  initializeEncryptionKeyBundle: () => Promise<unknown>;
  isSuppressed?: boolean;
}

export function EncryptionSetupGate({
  children,
  error,
  initializeEncryptionKeyBundle,
  isSuppressed = false,
}: EncryptionSetupGateProps) {
  const { user, isSessionLoading } = useSession();
  const wallet = useActiveWallet();
  const setupStartedForUser = useRef<string | null>(null);

  const isEncryptionReady = hasEncryptionKeyBundle(user);
  const needsEncryptionSetup = !isSessionLoading && user !== null && !isEncryptionReady;
  const isWalletReady = wallet !== null;

  useEffect(() => {
    if (isSuppressed || !needsEncryptionSetup || !isWalletReady || setupStartedForUser.current === user?.id) {
      return;
    }

    setupStartedForUser.current = user.id;
    initializeEncryptionKeyBundle().catch(() => undefined);
  }, [initializeEncryptionKeyBundle, isSuppressed, isWalletReady, needsEncryptionSetup, user?.id]);

  if (isSuppressed || !needsEncryptionSetup) {
    return children;
  }

  if (error) {
    throw error;
  }

  return <PageLoader />;
}
