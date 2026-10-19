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
}

export function EncryptionSetupGate({ children, isSuppressed = false }: EncryptionSetupGateProps) {
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

  if (isCryptoActive && editingUserId !== user?.id) {
    return children;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-88">
        {restoreError ? (
          <p role="alert" className="mb-4 text-copy-13 text-muted-foreground">
            {restoreError}
          </p>
        ) : null}
        <StorageAccess key={user?.id} onStart={start} onSuccess={complete} />
        <div className="mt-5 flex items-center justify-between gap-4">
          <a className="text-copy-13 text-muted-foreground hover:text-foreground" href="/account">
            Account settings
          </a>
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
    <Button variant="ghost" disabled={pending} onClick={signOut}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
