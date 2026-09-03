import { KeyIcon } from '@phosphor-icons/react';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from './button';
import { ComitiumMark } from './comitium-mark';
import { GoogleIcon } from './google';
import { Input } from './input';
import { Label } from './label';
import { Separator } from './separator';
import { Spinner } from './spinner';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from './verification-code-input';

export type AuthActionResult = { ok: true } | { ok: false; error: string };
export type AuthMode = 'sign-in' | 'sign-up';
type AuthMethod = 'email' | 'google' | 'passkey';
type PendingAuthAction = 'email' | 'code' | 'google' | 'passkey' | null;

interface AuthErrorState {
  message: string;
  method: AuthMethod;
}

interface LoginFormProps {
  authError?: string | null;
  mode: AuthMode;
  onSendCode: (email: string) => Promise<AuthActionResult>;
  onVerifyCode: (code: string) => Promise<AuthActionResult>;
  onGoogleLogin: () => Promise<AuthActionResult>;
  onPasskeyLogin: () => Promise<AuthActionResult>;
}

interface AuthLoginPageProps extends LoginFormProps {
  alternateAuthHref: string;
  homeHref: string;
  homeLabel: string;
  privacyHref: string;
  termsHref: string;
}

export function AuthLoginPage({
  alternateAuthHref,
  authError,
  homeHref,
  homeLabel,
  privacyHref,
  termsHref,
  onSendCode,
  onVerifyCode,
  onGoogleLogin,
  onPasskeyLogin,
  mode,
}: AuthLoginPageProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-5 py-12 sm:px-8 sm:py-16">
      <section aria-label={mode === 'sign-in' ? 'Sign in' : 'Sign up'} className="w-full max-w-88">
        <a
          href={homeHref}
          aria-label={homeLabel}
          className="mx-auto flex w-fit rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ComitiumMark className="h-10 w-auto" />
        </a>
        <LoginForm
          authError={authError}
          mode={mode}
          onSendCode={onSendCode}
          onVerifyCode={onVerifyCode}
          onGoogleLogin={onGoogleLogin}
          onPasskeyLogin={onPasskeyLogin}
        />
        <p className="mt-5 text-center text-copy-14 text-muted-foreground">
          {mode === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'}{' '}
          <a
            className="font-medium text-foreground transition-colors hover:text-foreground/80"
            href={alternateAuthHref}
          >
            {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
        {mode === 'sign-up' ? (
          <p className="mt-5 text-center text-copy-12 text-muted-foreground sm:whitespace-nowrap">
            By continuing, you agree to our{' '}
            <a
              className="font-medium text-foreground transition-colors hover:text-foreground/80"
              href={termsHref}
              target="_blank"
              rel="noreferrer"
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              className="font-medium text-foreground transition-colors hover:text-foreground/80"
              href={privacyHref}
              target="_blank"
              rel="noreferrer"
            >
              Privacy Notice
            </a>
            .
          </p>
        ) : null}
      </section>
    </div>
  );
}

function LoginForm({ authError, mode, onSendCode, onVerifyCode, onGoogleLogin, onPasskeyLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'complete'>('email');
  const [pendingAction, setPendingAction] = useState<PendingAuthAction>(null);
  const [error, setError] = useState<AuthErrorState | null>(null);

  useEffect(() => {
    setError(authError ? { message: authError, method: 'google' } : null);
  }, [authError]);

  const sendCode = useCallback(async () => {
    const normalizedEmail = email.trim();
    setError(null);
    setPendingAction('email');
    const result = await onSendCode(normalizedEmail);
    setPendingAction(null);

    if (!result.ok) {
      setError({ message: result.error, method: 'email' });
      return;
    }

    setEmail(normalizedEmail);
    setStep('code');
  }, [email, onSendCode]);

  const handleEmailSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendCode();
    },
    [sendCode],
  );

  const verifyCode = useCallback(
    async (verificationCode: string) => {
      if (verificationCode.length !== VERIFICATION_CODE_LENGTH || pendingAction !== null) {
        return;
      }

      setError(null);
      setPendingAction('code');
      const result = await onVerifyCode(verificationCode);

      if (!result.ok) {
        setPendingAction(null);
        setError({ message: result.error, method: 'email' });
        return;
      }

      setStep('complete');
    },
    [onVerifyCode, pendingAction],
  );

  const handleCodeSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await verifyCode(code);
    },
    [code, verifyCode],
  );

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setError(null);
  }, []);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.currentTarget.value);
    setError(null);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
    setPendingAction('google');
    const result = await onGoogleLogin();

    if (!result.ok) {
      setPendingAction(null);
      setError({ message: result.error, method: 'google' });
    }
  }, [onGoogleLogin]);

  const handlePasskeyLogin = useCallback(async () => {
    setError(null);
    setPendingAction('passkey');
    const result = await onPasskeyLogin();

    if (!result.ok) {
      setPendingAction(null);
      setError({ message: result.error, method: 'passkey' });
    }
  }, [onPasskeyLogin]);

  const handleChangeEmail = useCallback(() => {
    setCode('');
    setError(null);
    setPendingAction(null);
    setStep('email');
  }, []);

  const emailError = error?.method === 'email' ? error.message : null;
  const alternativeMethodError = error && error.method !== 'email' ? error.message : null;
  const emailStepTitle = mode === 'sign-in' ? 'Sign in to Comitium' : 'Sign up to Comitium';
  const title = step === 'email' ? emailStepTitle : 'Check your email';
  const emailActionLabel = mode === 'sign-in' ? 'Continue' : 'Continue with email';
  const emailSubmitLabel = pendingAction === 'email' ? 'Sending code...' : emailActionLabel;
  const codeActionLabel = mode === 'sign-in' ? 'Sign in' : 'Create account';
  const codeSubmitLabel = pendingAction === 'code' ? 'Verifying...' : codeActionLabel;

  if (step === 'complete') {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center" aria-live="polite">
        <Spinner className="size-5 text-primary" />
        <p className="text-heading-16">{mode === 'sign-in' ? 'Signing you in' : 'Creating your account'}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="text-center">
        <h1 className="text-heading-24 font-medium tracking-normal">{title}</h1>
        {step === 'code' ? (
          <p className="mt-2 text-copy-14 text-muted-foreground">
            Enter the 6-digit code sent to <span className="text-foreground">{email}</span>.
          </p>
        ) : null}
      </div>

      {step === 'email' ? (
        <div className="mt-8">
          <form onSubmit={handleEmailSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login-email" className="sr-only">
                Email
              </Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Email address"
                size="lg"
                value={email}
                onChange={handleEmailChange}
                disabled={pendingAction !== null}
                required
                autoFocus
              />
            </div>

            <AuthError message={emailError} />

            <Button
              type="submit"
              size="lg"
              className="w-full font-medium"
              disabled={pendingAction !== null || !email.trim()}
            >
              {pendingAction === 'email' && <Spinner data-icon="inline-start" />}
              {emailSubmitLabel}
            </Button>
          </form>

          <AuthMethodActions
            mode={mode}
            pendingAction={pendingAction}
            error={alternativeMethodError}
            onGoogleLogin={handleGoogleLogin}
            onPasskeyLogin={handlePasskeyLogin}
          />
        </div>
      ) : (
        <form onSubmit={handleCodeSubmit} className="mt-6 grid gap-5">
          <VerificationCodeInput
            value={code}
            onChange={handleCodeChange}
            onComplete={verifyCode}
            disabled={pendingAction !== null}
            autoFocus
          />

          <AuthError message={error?.message ?? null} />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pendingAction !== null || code.length !== VERIFICATION_CODE_LENGTH}
          >
            {pendingAction === 'code' && <Spinner data-icon="inline-start" />}
            {codeSubmitLabel}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleChangeEmail}
              disabled={pendingAction !== null}
            >
              Use another email
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={sendCode} disabled={pendingAction !== null}>
              {pendingAction === 'email' ? 'Sending...' : 'Resend code'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

interface AuthMethodActionsProps {
  error: string | null;
  mode: AuthMode;
  onGoogleLogin: () => void;
  onPasskeyLogin: () => void;
  pendingAction: PendingAuthAction;
}

function AuthMethodActions({ error, mode, onGoogleLogin, onPasskeyLogin, pendingAction }: AuthMethodActionsProps) {
  return (
    <>
      <AuthSeparator />
      <div className="grid gap-3">
        <GoogleAuthButton
          isPending={pendingAction === 'google'}
          disabled={pendingAction !== null}
          onClick={onGoogleLogin}
        />
        {mode === 'sign-in' ? (
          <PasskeyAuthButton
            isPending={pendingAction === 'passkey'}
            disabled={pendingAction !== null}
            onClick={onPasskeyLogin}
          />
        ) : null}
      </div>
      <AuthError message={error} />
    </>
  );
}

interface AuthMethodButtonProps {
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
}

function GoogleAuthButton({ disabled, isPending, onClick }: AuthMethodButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full font-medium"
      onClick={onClick}
      disabled={disabled}
    >
      {isPending ? <Spinner data-icon="inline-start" /> : <GoogleIcon className="size-4" />}
      Continue with Google
    </Button>
  );
}

function PasskeyAuthButton({ disabled, isPending, onClick }: AuthMethodButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full font-medium"
      onClick={onClick}
      disabled={disabled}
    >
      {isPending ? <Spinner data-icon="inline-start" /> : <KeyIcon className="size-4" />}
      {isPending ? 'Signing in...' : 'Continue with a passkey'}
    </Button>
  );
}

function AuthSeparator() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <Separator className="flex-1" />
      <span className="text-label-12 text-muted-foreground">or</span>
      <Separator className="flex-1" />
    </div>
  );
}

function AuthError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="text-copy-13 text-destructive-text">
      {message}
    </p>
  );
}
