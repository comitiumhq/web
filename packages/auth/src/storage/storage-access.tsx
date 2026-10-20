import { hasEncryptionKeyBundle, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import { useEffect, useRef, useState } from 'react';

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
  const { isCryptoActive } = useCryptoUnlock();
  const [selectedMode, setSelectedMode] = useState<StorageMode>(() => {
    const initial = initialMode ?? (hasEncryptionKeyBundle(user) ? 'unlock' : 'setup');

    if (initial === 'recovery' && !isCryptoActive) {
      return 'recovery-code';
    }

    return initial;
  });
  const [verifiedRecoveryCode, setVerifiedRecoveryCode] = useState('');
  const initialVersion = useRef(user?.userKeyVersion);
  const action = useStorageKeyAction();

  const hasRecoveryKit = hasRecoveryCodeWrap(user?.encryptedUserKey);
  const canRecover = isCryptoActive || hasRecoveryKit;
  const isRecovery = selectedMode === 'recovery' || selectedMode === 'recovery-code';
  const mode = isRecovery && !canRecover ? 'unlock' : selectedMode;
  const canGoBack = Boolean(onBack) || isRecovery;

  useEffect(() => {
    const hasNewKeyBundle = hasEncryptionKeyBundle(user) && user.userKeyVersion !== initialVersion.current;

    if (!action.pending && mode === 'setup' && hasNewKeyBundle) {
      setSelectedMode('unlock');
    }
  }, [action.pending, mode, user]);

  function changeMode(nextMode: StorageMode) {
    action.clearError();

    setVerifiedRecoveryCode('');
    setSelectedMode(nextMode);
  }

  function recover() {
    changeMode(isCryptoActive ? 'recovery' : 'recovery-code');
  }

  function goBack() {
    if (mode === 'recovery' && verifiedRecoveryCode) {
      changeMode('recovery-code');

      return;
    }

    const shouldReturnToUnlock = isRecovery && (!onBack || initialMode !== 'recovery');

    if (shouldReturnToUnlock) {
      changeMode('unlock');

      return;
    }

    onBack?.();
  }

  async function submit(values: StorageFormValues) {
    if (!user) {
      return;
    }

    onStart?.();

    const credentials = mode === 'recovery' ? { ...values, recoveryCode: verifiedRecoveryCode } : values;
    const keysChanged = mode !== 'unlock' && mode !== 'recovery-code';

    const success = await action.run(
      (onRecoveryCode, confirmFreshAuth) =>
        runStorageAction(mode, user, credentials, onRecoveryCode, confirmFreshAuth, requireRecovery),
      keysChanged,
    );

    if (!success) {
      return;
    }

    if (mode === 'recovery-code') {
      setVerifiedRecoveryCode(values.recoveryCode);
      setSelectedMode('recovery');

      return;
    }

    onSuccess?.();
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
      onBack={canGoBack ? goBack : undefined}
      onRecover={canRecover ? recover : undefined}
      hasRecoveryKit={hasRecoveryKit}
    />
  );
}
