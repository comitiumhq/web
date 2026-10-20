import { hasEncryptionKeyBundle, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import { Button } from '@comitium/ui/button';
import { PageLoader } from '@comitium/ui/page-loader';
import { type ReactNode, useCallback, useState } from 'react';

import { StorageAccess } from './storage/storage-access';
import { useCryptoUnlock } from './use-crypto-unlock';
import { useAccountLogout } from './use-logout';
import { useSession } from './use-session';

interface EncryptionSetupGateProps {
  children: ReactNode;
  isSuppressed?: boolean;
  requireRecovery?: boolean;
}

export function EncryptionSetupGate({
  children,
  isSuppressed = false,
  requireRecovery = false,
}: EncryptionSetupGateProps) {
  const { user, isSessionLoading } = useSession();
  const { isCryptoActive, isRestoring, restoreError } = useCryptoUnlock();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const start = useCallback(() => setEditingUserId(user?.id ?? null), [user?.id]);
  const complete = useCallback(() => setEditingUserId(null), []);

  if (isSuppressed || (!isSessionLoading && !user)) {
    return children;
  }

  if (isSessionLoading || isRestoring) {
    return <PageLoader />;
  }

  const hasUserKey = hasEncryptionKeyBundle(user);
  const needsRecovery = requireRecovery && hasUserKey && !hasRecoveryCodeWrap(user.encryptedUserKey);
  const showAccountSettings = hasUserKey && !needsRecovery;

  if (isCryptoActive && !needsRecovery && editingUserId !== user?.id) {
    return children;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-120">
        {restoreError ? (
          <p role="alert" className="mb-4 text-copy-13 text-muted-foreground">
            {restoreError}
          </p>
        ) : null}
        <StorageAccess
          key={user?.id}
          initialMode={needsRecovery ? 'recovery-kit' : undefined}
          requireRecovery={requireRecovery}
          onStart={start}
          onSuccess={complete}
        />
        <div className="mt-5 flex items-center justify-center">
          {showAccountSettings ? (
            <Button variant="text" className="text-copy-13" asChild>
              <a href="/account">Account settings</a>
            </Button>
          ) : null}
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}

function SignOutButton() {
  const logout = useAccountLogout('/login');
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    await logout();
    setPending(false);
  }, [logout]);

  return (
    <Button type="button" variant="text" className="text-copy-13" disabled={pending} onClick={signOut}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
