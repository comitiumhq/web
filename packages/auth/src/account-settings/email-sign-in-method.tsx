import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Spinner } from '@comitium/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { EnvelopeSimpleIcon, InfoIcon } from '@phosphor-icons/react';
import { useLinkEmail, useUpdateEmail } from '@privy-io/react-auth';
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react';

import type { LinkedSignInMethods } from '../linked-sign-in-methods';
import { getAccountMethodError } from './account-method-error';
import { SignInMethodRow } from './sign-in-method-row';
import type { RefreshUser } from './types';

interface EmailSignInMethodProps {
  email: LinkedSignInMethods['email'];
  refreshUser: RefreshUser;
}

export function EmailSignInMethod({ email, refreshUser }: EmailSignInMethodProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleComplete = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return (
    <>
      <SignInMethodRow
        icon={<EnvelopeSimpleIcon />}
        label={<EmailLabel />}
        value={email?.address ?? 'Not added'}
        action={
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            {email ? 'Change' : 'Add email'}
          </Button>
        }
      />

      {dialogOpen ? (
        <EmailMethodDialog
          hasEmail={email !== null}
          onComplete={handleComplete}
          onOpenChange={setDialogOpen}
          refreshUser={refreshUser}
        />
      ) : null}
    </>
  );
}

function EmailLabel() {
  return (
    <span className="inline-flex items-center gap-1">
      Email
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Email access guidance">
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4} className="max-w-64">
            For long-term access, use an email you personally control.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

interface EmailMethodDialogProps {
  hasEmail: boolean;
  onComplete: () => void;
  onOpenChange: (open: boolean) => void;
  refreshUser: RefreshUser;
}

function EmailMethodDialog({ hasEmail, onComplete, onOpenChange, refreshUser }: EmailMethodDialogProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendCode: sendLinkCode, linkWithCode } = useLinkEmail();
  const { sendCode: sendUpdateCode, verifyCode: verifyUpdateCode } = useUpdateEmail();

  const sendCode = useCallback(async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      if (hasEmail) {
        await sendUpdateCode({ newEmailAddress: normalizedEmail });
      } else {
        await sendLinkCode({ email: normalizedEmail });
      }

      setEmail(normalizedEmail);
      setStep('code');
    } catch (sendError) {
      setError(getAccountMethodError(sendError, 'send-email-code'));
    } finally {
      setIsPending(false);
    }
  }, [email, hasEmail, isPending, sendLinkCode, sendUpdateCode]);

  const verifyCode = useCallback(
    async (verificationCode: string) => {
      if (verificationCode.length !== VERIFICATION_CODE_LENGTH || isPending) {
        return;
      }

      setError(null);
      setIsPending(true);

      try {
        if (hasEmail) {
          await verifyUpdateCode({ code: verificationCode });
        } else {
          await linkWithCode({ code: verificationCode });
        }

        await refreshUser().catch(() => undefined);
        onComplete();
      } catch (verifyError) {
        setError(getAccountMethodError(verifyError, 'verify-email'));
      } finally {
        setIsPending(false);
      }
    },
    [hasEmail, isPending, linkWithCode, onComplete, refreshUser, verifyUpdateCode],
  );

  const handleEmailSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendCode();
    },
    [sendCode],
  );

  const handleCodeSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await verifyCode(code);
    },
    [code, verifyCode],
  );

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError(null);
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setError(null);
  }, []);

  const handleChangeEmail = useCallback(() => {
    setCode('');
    setError(null);
    setStep('email');
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
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
            <MethodError message={error} />
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
            <MethodError message={error} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={handleChangeEmail}>
                Change email
              </Button>
              <Button type="submit" disabled={isPending || code.length !== VERIFICATION_CODE_LENGTH}>
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? 'Verifying...' : 'Verify email'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-copy-13 text-destructive-text">
      {message}
    </p>
  ) : null;
}
