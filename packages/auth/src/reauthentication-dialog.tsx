import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { type FormEvent, useState } from 'react';
import { getAuthActionError } from './auth-action-error';
import { sendSignInCode, verifySignInCode } from './auth-actions';
import { useAuthClient } from './auth-context';
import { AuthFormError } from './auth-form-error';
import { unwrapAuthResult } from './auth-result';

interface ReauthenticationDialogProps {
  email: string;
  userId: string;
  onCancel: () => void;
  onConfirmed: () => void;
}

export function ReauthenticationDialog({ email, userId, onCancel, onConfirmed }: ReauthenticationDialogProps) {
  const client = useAuthClient();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmUser(authUserId: string | undefined) {
    if (authUserId !== userId) {
      throw new Error('Sign-in confirmation belongs to another account');
    }

    onConfirmed();
  }

  async function sendCode() {
    setIsPending(true);
    setError(null);

    try {
      await sendSignInCode(client, email);

      setCodeSent(true);
    } catch (error) {
      setError(getAuthActionError(error, 'send-code'));
    } finally {
      setIsPending(false);
    }
  }

  async function confirmWithCode(otp: string) {
    if (isPending || otp.length !== VERIFICATION_CODE_LENGTH) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await verifySignInCode(client, email, otp);

      confirmUser(result?.user.id);
    } catch (error) {
      setError(getAuthActionError(error, 'verify-code'));
    } finally {
      setIsPending(false);
    }
  }

  async function confirmWithPasskey() {
    setIsPending(true);
    setError(null);

    try {
      const result = unwrapAuthResult(await client.signIn.passkey());

      confirmUser(result?.user.id);
    } catch (error) {
      setError(getAuthActionError(error, 'passkey'));
    } finally {
      setIsPending(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await confirmWithCode(code);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your sign-in</DialogTitle>
          <DialogDescription>
            {codeSent
              ? `Enter the 6-digit code sent to ${email}.`
              : 'Confirm your identity before changing account security.'}
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
            <Button type="submit" disabled={isPending || code.length !== VERIFICATION_CODE_LENGTH}>
              Confirm
            </Button>
          </form>
        ) : (
          <Button disabled={isPending} onClick={sendCode}>
            Send code to {email}
          </Button>
        )}
        <AuthFormError message={error} />
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending || typeof PublicKeyCredential === 'undefined'}
            onClick={confirmWithPasskey}
          >
            Use a passkey
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
