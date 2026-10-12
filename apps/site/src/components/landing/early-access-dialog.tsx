import { isApiError } from '@comitium/schemas/api-errors';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Spinner } from '@comitium/ui/spinner';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type FormEvent, useId, useRef, useState } from 'react';
import { submitEarlyAccessRequest } from '@/lib/early-access-api';

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

function EarlyAccessForm() {
  const emailId = useId();
  const companyId = useId();
  const compactChallenge = useMediaQuery('(max-width: 359px)');
  const challenge = useRef<TurnstileInstance>(null);
  const submission = useRef<{ fields: string; id: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [challengeInteractive, setChallengeInteractive] = useState(false);
  const request = useMutation({ mutationFn: submitEarlyAccessRequest });

  function failVerification() {
    setToken(null);
    setChallengeInteractive(false);
    setVerificationError('We couldn’t verify this request. Please try again.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.isPending) return;

    if (!siteKey || !token) {
      setVerificationError('Verification is unavailable. Please try again later.');
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const company = String(data.get('company') ?? '').trim();
    const fields = JSON.stringify([email, company]);

    if (submission.current?.fields !== fields) {
      submission.current = { fields, id: crypto.randomUUID() };
    }

    try {
      await request.mutateAsync({ email, company, turnstileToken: token, requestId: submission.current.id });
    } catch (error) {
      if (isApiError(error, (error) => error.status === 400)) {
        setEmailError(error.message);
      }
      // Siteverify tokens are single-use, including when the subsequent email send fails.
      setToken(null);
      challenge.current?.reset();
    }
  }

  let errorMessage = verificationError;
  if (!errorMessage && request.isError) {
    if (isApiError(request.error, (error) => error.status === 429)) {
      errorMessage = 'Too many requests. Please wait a minute and try again.';
    } else if (!isApiError(request.error, (error) => error.status === 400)) {
      errorMessage = 'We couldn’t send your request. Please try again.';
    }
  }

  return request.isSuccess ? (
    <>
      <DialogHeader className="pr-6">
        <DialogTitle className="text-2xl leading-7 tracking-tight">We’ll be in touch.</DialogTitle>
        <DialogDescription className="text-base leading-6">
          We’ll follow up about early access at
          <span className="mt-1 block break-all text-foreground">{request.variables.email}</span>
        </DialogDescription>
      </DialogHeader>
      <DialogClose asChild>
        <Button variant="outline" className="justify-self-start px-5">
          Close
        </Button>
      </DialogClose>
    </>
  ) : (
    <>
      <DialogHeader className="pr-6">
        <DialogTitle className="text-2xl leading-7 tracking-tight">Request early access</DialogTitle>
        <DialogDescription className="text-base leading-6">Leave your email and we’ll be in touch.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-5">
        <fieldset disabled={request.isPending} className="grid gap-5">
          <div className="grid gap-2.5">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              maxLength={255}
              size="lg"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              onInvalid={(event) => {
                event.preventDefault();
                setEmailError(
                  event.currentTarget.validity.valueMissing
                    ? 'Enter your email address.'
                    : 'Enter a valid email address.',
                );
                event.currentTarget.focus();
              }}
              onChange={() => {
                setEmailError(null);
                if (request.isError) request.reset();
              }}
            />
            {emailError && (
              <p id={`${emailId}-error`} role="alert" className="text-sm leading-5 text-destructive">
                {emailError}
              </p>
            )}
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor={companyId}>
              Company <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id={companyId}
              name="company"
              autoComplete="organization"
              placeholder="Company name"
              maxLength={200}
              size="lg"
            />
          </div>
        </fieldset>
        <div>
          {siteKey && (
            <Turnstile
              ref={challenge}
              siteKey={siteKey}
              className={challengeInteractive ? 'mb-5' : undefined}
              options={{
                action: 'early-access',
                theme: 'light',
                size: compactChallenge ? 'compact' : 'flexible',
                appearance: 'interaction-only',
              }}
              onSuccess={(verifiedToken) => {
                setToken(verifiedToken);
                setVerificationError(null);
                setChallengeInteractive(false);
              }}
              onBeforeInteractive={() => setChallengeInteractive(true)}
              onAfterInteractive={() => setChallengeInteractive(false)}
              onExpire={() => setToken(null)}
              onError={failVerification}
              onUnsupported={failVerification}
              scriptOptions={{ onError: failVerification }}
            />
          )}
          {errorMessage && (
            <p role="alert" className="mb-3 text-sm leading-5 text-destructive">
              {errorMessage}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={request.isPending || Boolean(siteKey && !token)}
            aria-busy={request.isPending}
          >
            {request.isPending && <Spinner aria-label="Sending request" />}
            {request.isPending ? 'Sending request…' : 'Request early access'}
          </Button>
        </div>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          We’ll use your details to follow up about early access.{' '}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy policy
          </Link>
        </p>
      </form>
    </>
  );
}

export default function EarlyAccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-7 sm:p-8">
        <EarlyAccessForm />
      </DialogContent>
    </Dialog>
  );
}
