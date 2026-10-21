import { Button } from '@comitium/ui/button';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Spinner } from '@comitium/ui/spinner';
import { type FormEvent, useId, useState } from 'react';

import { AuthFormError } from '../auth-form-error';
import { PasswordField } from './password/password-field';
import { StorageFormHeader } from './storage-form-header';
import type { StorageFormValues, StorageMode } from './types';

const TITLES: Record<StorageMode, string> = {
  setup: 'Create a password',
  unlock: 'Enter your password',
  'recovery-code': 'Enter your recovery code',
  recovery: 'Create a new password',
  change: 'Change your password',
  'create-recovery-code': 'Create a recovery code',
};

interface StorageFormProps {
  mode: StorageMode;
  pending: boolean;
  error: string | null;
  onSubmit: (values: StorageFormValues) => Promise<void>;
  onBack?: () => void;
  hasRecoveryCode?: boolean;
  onRecover?: () => void;
  dialog?: boolean;
}

export function StorageForm({
  mode,
  pending,
  error,
  onSubmit,
  onBack,
  hasRecoveryCode = false,
  onRecover,
  dialog = false,
}: StorageFormProps) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isRecoveryCode = mode === 'recovery-code';
  const isChangingPassword = mode === 'change';
  const isNewPassword = mode === 'setup' || mode === 'change' || mode === 'recovery';

  let title = TITLES[mode];
  let submitLabel = 'Continue';
  let passwordLabel = isNewPassword && mode !== 'setup' ? 'New password' : 'Password';
  let description: string | undefined;

  if (mode === 'setup') {
    description = 'This password protects your encrypted data.';
  } else if (isRecoveryCode) {
    description = 'You’ll find it in your recovery kit.';
  } else if (mode === 'create-recovery-code') {
    description = hasRecoveryCode
      ? 'The new recovery code will replace your current code.'
      : 'Enter your current password to continue.';
  }

  if (mode === 'unlock') {
    submitLabel = 'Unlock';
  } else if (isChangingPassword || mode === 'recovery') {
    submitLabel = 'Change password';
  }

  if (mode === 'create-recovery-code') {
    passwordLabel = 'Current password';
  }

  if (mode === 'create-recovery-code' && hasRecoveryCode) {
    title = 'Replace recovery code';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (isNewPassword && password !== confirmation) {
      setValidationError('Passwords do not match.');

      return;
    }

    setValidationError(null);

    await onSubmit({ password, currentPassword, recoveryCode });
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-5" aria-label={title}>
        <StorageFormHeader title={title} description={description} dialog={dialog} pending={pending} onBack={onBack} />
        {isChangingPassword ? (
          <div className="grid gap-1">
            <PasswordField
              id={`${id}-current`}
              label="Current password"
              name="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.currentTarget.value)}
              disabled={pending}
              required
              autoFocus
            />
            {onRecover ? (
              <Button
                type="button"
                variant="text"
                size="sm"
                className="w-fit px-0 text-copy-13"
                disabled={pending}
                onClick={onRecover}
              >
                Forgot password?
              </Button>
            ) : null}
          </div>
        ) : null}
        {isRecoveryCode ? (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-recovery`}>Recovery code</Label>
            <Input
              id={`${id}-recovery`}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.currentTarget.value)}
              disabled={pending}
              required
              autoFocus
            />
          </div>
        ) : null}
        {!isRecoveryCode ? (
          <PasswordField
            id={`${id}-password`}
            label={passwordLabel}
            name="password"
            autoComplete={isNewPassword ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            disabled={pending}
            showStrength={isNewPassword}
            minLength={isNewPassword ? 12 : undefined}
            required
            autoFocus={!isChangingPassword}
          />
        ) : null}
        {isNewPassword ? (
          <PasswordField
            id={`${id}-confirmation`}
            label="Confirm password"
            name="password-confirmation"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            disabled={pending}
            required
          />
        ) : null}
        <AuthFormError message={validationError ?? error} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? 'Please wait…' : submitLabel}
        </Button>
      </form>
      {mode === 'unlock' && onRecover ? (
        <Button variant="text" className="mx-auto text-copy-13" disabled={pending} onClick={onRecover}>
          Forgot password?
        </Button>
      ) : null}
      {mode === 'unlock' && !onRecover ? (
        <p className="text-copy-13 text-muted-foreground">
          Forgot your password? Use a device where your data is still unlocked.
        </p>
      ) : null}
    </div>
  );
}
