import { Button } from '@comitium/ui/button';
import { Spinner } from '@comitium/ui/spinner';
import { KeyIcon } from '@phosphor-icons/react';
import { useLinkWithPasskey } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';

import { SignInMethodRow } from './sign-in-method-row';
import type { RefreshUser } from './types';

interface PasskeySignInMethodProps {
  passkeyCount: number;
  refreshUser: RefreshUser;
}

function getPasskeySummary(passkeyCount: number): string {
  if (passkeyCount === 0) {
    return 'Not added';
  }

  if (passkeyCount === 1) {
    return '1 passkey';
  }

  return `${passkeyCount} passkeys`;
}

export function PasskeySignInMethod({ passkeyCount, refreshUser }: PasskeySignInMethodProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { linkWithPasskey } = useLinkWithPasskey();

  const handleAddPasskey = useCallback(async () => {
    if (isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await linkWithPasskey();
      await refreshUser().catch(() => undefined);
    } catch {
      setError('We could not add the passkey. Try again.');
    } finally {
      setIsPending(false);
    }
  }, [isPending, linkWithPasskey, refreshUser]);

  const actionLabel = passkeyCount > 0 ? 'Add another' : 'Add passkey';

  return (
    <SignInMethodRow
      icon={<KeyIcon />}
      label="Passkey"
      value={getPasskeySummary(passkeyCount)}
      error={error}
      action={
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleAddPasskey}>
          {isPending && <Spinner data-icon="inline-start" />}
          {isPending ? 'Adding...' : actionLabel}
        </Button>
      }
    />
  );
}
