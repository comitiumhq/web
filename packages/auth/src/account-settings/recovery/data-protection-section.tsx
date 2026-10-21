import { CryptoProxy } from '@comitium/crypto';
import { type EncryptionReadyUser, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import type { User } from '@comitium/schemas/auth';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { Dialog, DialogContent } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { FileKeyIcon, RectangleEllipsisIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { RecoveryCodeStep } from '../../storage/recovery/recovery-code-step';
import { StorageAccess } from '../../storage/storage-access';
import { useStorageKeyAction } from '../../storage/use-storage-key-action';
import { useCryptoUnlock } from '../../use-crypto-unlock';
import { AccountSettingRow } from '../account-setting-row';

interface DataProtectionSectionProps {
  user: EncryptionReadyUser<User>;
}

export function DataProtectionSection({ user }: DataProtectionSectionProps) {
  const { isCryptoActive } = useCryptoUnlock();
  const recovery = useStorageKeyAction();
  const recoveryButton = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<'change' | 'create-recovery-code' | null>(null);
  const hasRecovery = hasRecoveryCodeWrap(user.encryptedUserKey);
  const recoveryAction = hasRecovery ? 'Replace recovery code' : 'Create recovery code';

  function close() {
    setMode(null);
  }

  async function createRecoveryCode() {
    if (!isCryptoActive) {
      setMode('create-recovery-code');

      return;
    }

    await recovery.run(async (onRecoveryCode, confirmFreshAuth) => {
      await CryptoProxy.rewrapUserKey(
        user.encryptedUserKey,
        { rotateRecoveryCode: true, repairShare: false },
        onRecoveryCode,
        confirmFreshAuth,
      );

      return undefined;
    }, true);
  }

  function closeRecovery(open: boolean) {
    if (!open && !recovery.recoveryConfirmed) {
      recovery.cancelRecovery();
    }
  }

  function restoreRecoveryFocus(event: Event) {
    event.preventDefault();

    recoveryButton.current?.focus();
  }

  return (
    <>
      <Card size="sm" className="gap-2">
        <CardHeader>
          <CardTitle>
            <h2>Password and recovery</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-separator p-0">
          <AccountSettingRow
            icon={<RectangleEllipsisIcon />}
            label="Password"
            value="Used to unlock your encrypted data."
            action={
              <Button
                variant="outline"
                size="sm"
                aria-label="Change password"
                disabled={recovery.pending}
                onClick={() => setMode('change')}
              >
                Change
              </Button>
            }
          />
          <AccountSettingRow
            icon={<FileKeyIcon />}
            label="Recovery code"
            value="Recover your encrypted data if you forget your password."
            error={recovery.error}
            action={
              <Button
                ref={recoveryButton}
                variant="outline"
                size="sm"
                aria-label={recoveryAction}
                disabled={recovery.pending}
                onClick={createRecoveryCode}
              >
                {recovery.pending ? <Spinner data-icon="inline-start" /> : null}
                {hasRecovery ? 'Replace' : 'Create'}
              </Button>
            }
          />
        </CardContent>
      </Card>
      {mode ? (
        <StorageAccess key={`${user.id}:${mode}`} initialMode={mode} onSuccess={close} onBack={close} dialog />
      ) : null}
      <Dialog open={Boolean(recovery.recoveryCode)} onOpenChange={closeRecovery}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:p-8"
          aria-describedby={undefined}
          showCloseButton={!recovery.recoveryConfirmed}
          onCloseAutoFocus={restoreRecoveryFocus}
        >
          {recovery.recoveryCode ? (
            <RecoveryCodeStep
              code={recovery.recoveryCode}
              saving={recovery.recoveryConfirmed}
              replacing={hasRecovery}
              onConfirm={recovery.confirmRecovery}
              dialog
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
