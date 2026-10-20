import { CryptoProxy } from '@comitium/crypto';
import { type EncryptionReadyUser, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import type { User } from '@comitium/schemas/auth';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { AuthFormError } from '../../auth-form-error';
import { StorageAccess } from '../../storage/storage-access';
import type { StorageMode } from '../../storage/types';
import { useStorageKeyAction } from '../../storage/use-storage-key-action';
import { useCryptoUnlock } from '../../use-crypto-unlock';

interface DataProtectionSectionProps {
  user: EncryptionReadyUser<User>;
}

export function DataProtectionSection({ user }: DataProtectionSectionProps) {
  const queryClient = useQueryClient();
  const { isCryptoActive } = useCryptoUnlock();
  const action = useStorageKeyAction();
  const [mode, setMode] = useState<StorageMode | null>(null);
  const close = useCallback(() => setMode(null), []);
  const unlock = useCallback(() => setMode('unlock'), []);
  const changePassword = useCallback(() => setMode('change'), []);
  const recoverCode = useCallback(() => setMode('recovery'), []);
  const openRecoveryKit = useCallback(() => setMode('recovery-kit'), []);
  const hasRecovery = hasRecoveryCodeWrap(user.encryptedUserKey);

  const forgetDevice = useCallback(async () => {
    await action.run(async () => {
      try {
        await CryptoProxy.forgetRememberedDevice(user.encryptedUserKey, user.id, user.publicKey);
      } finally {
        queryClient.clear();
      }

      return undefined;
    });
  }, [action, queryClient, user]);

  return (
    <Card size="sm">
      <CardContent className="grid gap-4">
        <h2 className="text-heading-16">Data protection</h2>
        {mode ? <StorageAccess key={`${user.id}:${mode}`} initialMode={mode} onSuccess={close} onBack={close} /> : null}
        {!mode ? (
          <>
            <p className="text-copy-14 text-muted-foreground">
              {isCryptoActive
                ? 'Your encrypted data is unlocked on this device.'
                : 'Your encrypted data is locked on this device.'}
            </p>
            {!isCryptoActive ? (
              <Button className="w-fit" onClick={unlock}>
                Unlock data
              </Button>
            ) : null}
            <div className="grid divide-y divide-separator">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <p className="text-copy-14">Password</p>
                <Button variant="outline" onClick={changePassword}>
                  Change password
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-copy-14">Recovery kit</p>
                  <p className="mt-1 text-copy-13 text-muted-foreground">
                    {hasRecovery
                      ? 'A new kit replaces your previous recovery code.'
                      : 'Save a backup in case you forget your password.'}
                  </p>
                </div>
                <Button variant="outline" onClick={openRecoveryKit}>
                  {hasRecovery ? 'Replace recovery kit' : 'Create recovery kit'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-copy-14">This device</p>
                  <p className="mt-1 text-copy-13 text-muted-foreground">
                    Lock your encrypted data and require your password to open it again.
                  </p>
                </div>
                <Button variant="outline" disabled={action.pending} onClick={forgetDevice}>
                  Forget this device
                </Button>
              </div>
            </div>
            {isCryptoActive || hasRecovery ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="text" size="sm" className="px-0 text-copy-13" onClick={recoverCode}>
                  Forgot password?
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        <AuthFormError message={action.error} />
      </CardContent>
    </Card>
  );
}
