import { hasEncryptionKeyBundle, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCryptoUnlock } from '../use-crypto-unlock';
import { useSession } from '../use-session';
import { RecoveryCodeStep } from './recovery/recovery-code-step';
import { runStorageAction } from './storage-actions';
import { StorageForm } from './storage-form';
import type { StorageFormValues, StorageMode } from './types';
import { useStorageKeyAction } from './use-storage-key-action';

interface StorageAccessProps {
  initialMode?: StorageMode;
  onSuccess?: () => void;
  onStart?: () => void;
  onBack?: () => void;
  requireRecovery?: boolean;
}

export function StorageAccess({
  initialMode,
  onSuccess,
  onStart,
  onBack,
  requireRecovery = false,
}: StorageAccessProps) {
  const { user } = useSession();
  const [selectedMode, setMode] = useState<StorageMode>(
    initialMode ?? (hasEncryptionKeyBundle(user) ? 'unlock' : 'setup'),
  );
  const { isCryptoActive } = useCryptoUnlock();
  const hasRecoveryKit = hasRecoveryCodeWrap(user?.encryptedUserKey);
  const canRecover = isCryptoActive || hasRecoveryKit;
  const mode = selectedMode === 'recovery' && !canRecover ? 'unlock' : selectedMode;
  const action = useStorageKeyAction();
  const initialVersion = useRef(user?.userKeyVersion);

  useEffect(() => {
    const hasNewKeyBundle = hasEncryptionKeyBundle(user) && user.userKeyVersion !== initialVersion.current;

    if (!action.pending && mode === 'setup' && hasNewKeyBundle) {
      setMode('unlock');
    }
  }, [action.pending, mode, user]);

  const submit = useCallback(
    async (values: StorageFormValues) => {
      if (!user) {
        return;
      }

      onStart?.();

      const success = await action.run(
        (onRecoveryCode, confirmFreshAuth) =>
          runStorageAction(mode, user, values, onRecoveryCode, confirmFreshAuth, requireRecovery),
        mode !== 'unlock',
      );

      if (success) {
        onSuccess?.();
      }
    },
    [action, mode, onStart, onSuccess, requireRecovery, user],
  );

  const recover = useCallback(() => setMode('recovery'), []);
  const unlock = useCallback(() => setMode('unlock'), []);
  let back = onBack;

  if (mode === 'recovery' && (!onBack || initialMode !== 'recovery')) {
    back = unlock;
  }

  if (!user) {
    return null;
  }

  if (action.recoveryCode) {
    return (
      <RecoveryCodeStep
        code={action.recoveryCode}
        saving={action.recoveryConfirmed}
        onConfirm={action.confirmRecovery}
        onCancel={action.cancelRecovery}
      />
    );
  }

  return (
    <StorageForm
      key={mode}
      mode={mode}
      pending={action.pending}
      error={action.error}
      onSubmit={submit}
      onBack={back}
      onRecover={canRecover ? recover : undefined}
      hasRecoveryKit={hasRecoveryKit}
      recoveryCodeRequired={!isCryptoActive}
    />
  );
}
