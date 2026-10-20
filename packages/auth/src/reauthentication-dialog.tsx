import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { type FormEvent, useState } from 'react';

import { getAuthActionError } from './auth-action-error';
import { sendSignInCode, verifySignInCode } from './auth-actions';
import { useAuthClient } from './auth-context';
import { AuthFormError } from './auth-form-error';
import { unwrapAuthResult } from './auth-result';
import { ResendCodeButton } from './resend-code-button';
import { useResendCooldown } from './use-resend-cooldown';

interface ReauthenticationDialogProps {
  email: string;
  userId: string;
  onCancel: () => void;
  onConfirmed: () => void;
}

export function ReauthenticationDialog({ email, userId, onCancel, onConfirmed }: ReauthenticationDialogProps) {
  const client = useAuthClient();
  const passkeys = client.useListPasskeys();
  const cooldown = useResendCooldown();

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [pendingAction, setPendingAction] = useState<'send' | 'verify' | 'passkey' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = pendingAction !== null;
  const canUsePasskey =
    !passkeys.error && (passkeys.data?.length ?? 0) > 0 && typeof PublicKeyCredential !== 'undefined';

  function confirmUser(authUserId: string | undefined) {
    if (authUserId !== userId) {
      throw new Error('Sign-in confirmation belongs to another account');
    }

    onConfirmed();
  }

  async function sendCode() {
    if (isPending || (codeSent && cooldown.isActive)) {
      return;
    }

    setPendingAction('send');
    setError(null);

    try {
      await sendSignInCode(client, email);

      setCode('');
      setCodeSent(true);

      cooldown.start();
    } catch (error) {
      setError(getAuthActionError(error, 'send-code'));
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmWithCode(otp: string) {
    if (isPending || otp.length !== VERIFICATION_CODE_LENGTH) {
      return;
    }

    setPendingAction('verify');
    setError(null);

    try {
      const result = await verifySignInCode(client, email, otp);

      confirmUser(result?.user.id);
    } catch (error) {
      setError(getAuthActionError(error, 'verify-code'));
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmWithPasskey() {
    setPendingAction('passkey');
    setError(null);

    try {
      const result = unwrapAuthResult(await client.signIn.passkey());

      confirmUser(result?.user.id);
    } catch (error) {
      setError(getAuthActionError(error, 'passkey'));
    } finally {
      setPendingAction(null);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await confirmWithCode(code);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm p-6 sm:max-w-sm sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-heading-20">Verify It’s You</DialogTitle>
          <DialogDescription>
            {codeSent ? 'Enter the 6-digit code sent to:' : 'We’ll send a verification code to:'}
            <span className="mt-2 block break-words font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>
        {codeSent ? (
          <form className="grid gap-4" onSubmit={submitCode}>
            <VerificationCodeInput
              value={code}
              onChange={setCode}
              onComplete={confirmWithCode}
              disabled={isPending}
              autoFocus
            />
            <div className="grid gap-3">
              <Button type="submit" size="lg" disabled={isPending || code.length !== VERIFICATION_CODE_LENGTH}>
                {pendingAction === 'verify' ? 'Verifying…' : 'Verify'}
              </Button>
              <ResendCodeButton
                remaining={cooldown.remaining}
                disabled={isPending}
                sending={pendingAction === 'send'}
                onClick={sendCode}
              />
            </div>
          </form>
        ) : (
          <Button size="lg" disabled={isPending} onClick={sendCode}>
            {pendingAction === 'send' ? 'Sending…' : 'Send code'}
          </Button>
        )}
        <AuthFormError message={error} />
        {!codeSent && canUsePasskey ? (
          <Button variant="text" className="mx-auto" disabled={isPending} onClick={confirmWithPasskey}>
            Use a passkey
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
