import { BackButton } from '@comitium/ui/back-button';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Spinner } from '@comitium/ui/spinner';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useAuthClient } from '../auth-context';
import { AuthFormError } from '../auth-form-error';
import { unwrapAuthResult } from '../auth-result';
import { useFreshAuthentication } from '../fresh-authentication';
import { ResendCodeButton } from '../resend-code-button';
import { useResendCooldown } from '../use-resend-cooldown';
import { getAccountMethodError } from './account-method-error';
import type { RefreshMethods } from './types';

interface EmailMethodDialogProps {
  hasEmail: boolean;
  onComplete: () => void;
  onOpenChange: (open: boolean) => void;
  refreshMethods: RefreshMethods;
}

export function EmailMethodDialog({ hasEmail, onComplete, onOpenChange, refreshMethods }: EmailMethodDialogProps) {
  const client = useAuthClient();
  const runWithFreshAuth = useFreshAuthentication();
  const cooldown = useResendCooldown();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [pendingAction, setPendingAction] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = pendingAction !== null;

  async function sendCode() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || isPending || (step === 'code' && cooldown.isActive)) {
      return;
    }

    setError(null);
    setPendingAction('send');

    try {
      await runWithFreshAuth(async () =>
        unwrapAuthResult(
          await client.emailOtp.requestEmailChange({
            newEmail: normalizedEmail,
            // Sending the code does not change the current session.
            fetchOptions: { disableSignal: true },
          }),
        ),
      );

      setEmail(normalizedEmail);
      setCode('');
      setStep('code');

      cooldown.start();
    } catch (sendError) {
      setError(getAccountMethodError(sendError, 'send-email-code'));
    } finally {
      setPendingAction(null);
    }
  }

  async function verifyCode(verificationCode: string) {
    if (verificationCode.length !== VERIFICATION_CODE_LENGTH || isPending) {
      return;
    }

    setError(null);
    setPendingAction('verify');

    try {
      await runWithFreshAuth(async () =>
        unwrapAuthResult(await client.emailOtp.changeEmail({ newEmail: email, otp: verificationCode })),
      );

      await refreshMethods();

      onComplete();
    } catch (verifyError) {
      setError(getAccountMethodError(verifyError, 'verify-email'));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await sendCode();
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await verifyCode(code);
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    setError(null);
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setError(null);
  }

  function handleChangeEmail() {
    cooldown.reset();
    setCode('');
    setError(null);
    setStep('email');
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        {step === 'code' ? <BackButton disabled={isPending} onClick={handleChangeEmail} /> : null}
        <DialogHeader>
          <DialogTitle>{hasEmail ? 'Change email' : 'Add email'}</DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? 'We will send a verification code to this address.'
              : `Enter the 6-digit code sent to ${email}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <form className="grid gap-4" onSubmit={handleEmailSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="account-email">Email address</Label>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isPending}
                autoFocus
                required
              />
            </div>
            <AuthFormError message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !email.trim()}>
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? 'Sending...' : 'Send code'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form className="grid gap-4" onSubmit={handleCodeSubmit}>
            <VerificationCodeInput
              value={code}
              onChange={handleCodeChange}
              onComplete={verifyCode}
              disabled={isPending}
              autoFocus
            />
            <AuthFormError message={error} />
            <div className="grid gap-3">
              <Button type="submit" disabled={isPending || code.length !== VERIFICATION_CODE_LENGTH}>
                {pendingAction === 'verify' && <Spinner data-icon="inline-start" />}
                {pendingAction === 'verify' ? 'Verifying...' : 'Verify email'}
              </Button>
              <ResendCodeButton
                remaining={cooldown.remaining}
                disabled={isPending}
                sending={pendingAction === 'send'}
                onClick={sendCode}
              />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
