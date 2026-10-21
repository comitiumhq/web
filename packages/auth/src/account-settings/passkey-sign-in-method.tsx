import { Button } from '@comitium/ui/button';
import { Spinner } from '@comitium/ui/spinner';
import { KeyIcon } from 'lucide-react';
import { useState } from 'react';

import { useAuthClient } from '../auth-context';
import { unwrapAuthResult } from '../auth-result';
import { useFreshAuthentication } from '../fresh-authentication';
import { AccountSettingRow } from './account-setting-row';
import type { RefreshMethods } from './types';

interface PasskeySignInMethodProps {
  passkeyCount: number;
  refreshMethods: RefreshMethods;
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

export function PasskeySignInMethod({ passkeyCount, refreshMethods }: PasskeySignInMethodProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useAuthClient();
  const runWithFreshAuth = useFreshAuthentication();

  async function handleAddPasskey() {
    if (isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await runWithFreshAuth(async () => unwrapAuthResult(await client.passkey.addPasskey()));
      await refreshMethods();
    } catch {
      setError('We could not add the passkey. Try again.');
    } finally {
      setIsPending(false);
    }
  }

  const actionLabel = passkeyCount > 0 ? 'Add another' : 'Add passkey';

  return (
    <AccountSettingRow
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
