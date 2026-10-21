import { hasEncryptionKeyBundle, hasRecoveryCodeWrap } from '@comitium/crypto/key-bundle';
import { Dialog, DialogContent } from '@comitium/ui/dialog';
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
  dialog?: boolean;
}

export function StorageAccess({
  initialMode,
  onSuccess,
  onStart,
  onBack,
  requireRecovery = false,
  dialog = false,
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
  const [dialogTrigger] = useState(() => (dialog && typeof document !== 'undefined' ? document.activeElement : null));
  const initialVersion = useRef(user?.userKeyVersion);
  const action = useStorageKeyAction();

  const hasRecoveryCode = hasRecoveryCodeWrap(user?.encryptedUserKey);
  const canRecover = isCryptoActive || hasRecoveryCode;
  const isRecovery = selectedMode === 'recovery' || selectedMode === 'recovery-code';
  const mode = isRecovery && !canRecover ? 'unlock' : selectedMode;
  const canGoBack = isRecovery || (!dialog && Boolean(onBack));
  const awaitingRecoveryConfirmation = Boolean(action.recoveryCode) && !action.recoveryConfirmed;
  const canDismiss = !action.pending || awaitingRecoveryConfirmation;

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

    const shouldReturnToPassword = isRecovery && (!onBack || initialMode !== 'recovery');

    if (shouldReturnToPassword) {
      changeMode(initialMode === 'change' ? 'change' : 'unlock');

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

  function handleOpenChange(open: boolean) {
    if (!open && canDismiss) {
      onBack?.();
    }
  }

  function restoreDialogFocus(event: Event) {
    if (dialogTrigger instanceof HTMLElement) {
      event.preventDefault();

      dialogTrigger.focus();
    }
  }

  if (!user) {
    return null;
  }

  const content = action.recoveryCode ? (
    <RecoveryCodeStep
      code={action.recoveryCode}
      saving={action.recoveryConfirmed}
      replacing={hasRecoveryCode}
      onConfirm={action.confirmRecovery}
      onCancel={action.cancelRecovery}
      dialog={dialog}
    />
  ) : (
    <StorageForm
      key={mode}
      mode={mode}
      pending={action.pending}
      error={action.error}
      onSubmit={submit}
      onBack={canGoBack ? goBack : undefined}
      onRecover={canRecover ? recover : undefined}
      hasRecoveryCode={hasRecoveryCode}
      dialog={dialog}
    />
  );

  if (!dialog) {
    return content;
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:p-8"
        aria-describedby={undefined}
        showCloseButton={canDismiss}
        onCloseAutoFocus={restoreDialogFocus}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
