import { AuthLoginSurface } from '@comitium/auth/login-surface';
import type { AuthMode } from '@comitium/ui/auth-login-page';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  initOAuth: vi.fn(),
  loginWithCode: vi.fn(),
  loginWithPasskey: vi.fn(),
  navigate: vi.fn(),
  oauthState: { status: 'initial' } as
    | { status: 'initial' }
    | { status: 'loading' }
    | { status: 'done' }
    | { status: 'error'; error: Error | null },
  recoverSession: vi.fn(),
  sendCode: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  useLoginWithEmail: () => ({
    loginWithCode: mocks.loginWithCode,
    sendCode: mocks.sendCode,
    state: { status: 'initial' },
  }),
  useLoginWithOAuth: () => ({
    initOAuth: mocks.initOAuth,
    loading: false,
    state: mocks.oauthState,
  }),
  useLoginWithPasskey: () => ({
    loginWithPasskey: mocks.loginWithPasskey,
    state: { status: 'initial' },
  }),
}));

function renderSurface(mode: AuthMode) {
  return render(
    <AuthLoginSurface
      defaultReturnTo="/"
      homeHref="/"
      homeLabel="Home"
      mode={mode}
      navigate={mocks.navigate}
      privacyHref="/privacy"
      recoverSession={mocks.recoverSession}
      returnTo="/org/example"
      session={{ isSessionLoading: false, isSignedIn: false, needsSessionRecovery: false }}
      termsHref="/terms"
    />,
  );
}

beforeEach(() => {
  mocks.initOAuth.mockReset();
  mocks.initOAuth.mockResolvedValue(undefined);
  mocks.loginWithCode.mockReset();
  mocks.loginWithCode.mockResolvedValue(undefined);
  mocks.loginWithPasskey.mockReset();
  mocks.loginWithPasskey.mockResolvedValue(undefined);
  mocks.navigate.mockReset();
  mocks.oauthState = { status: 'initial' };
  mocks.recoverSession.mockReset();
  mocks.recoverSession.mockResolvedValue(true);
  mocks.sendCode.mockReset();
  mocks.sendCode.mockResolvedValue(undefined);
});

describe('AuthLoginSurface intent boundaries', () => {
  it('keeps email and Google sign-in from creating an account', async () => {
    const screen = await renderSurface('sign-in');

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    expect(mocks.sendCode).toHaveBeenCalledWith({ email: 'person@example.com', disableSignup: true });

    await screen.getByRole('button', { name: 'Use another email' }).click();
    await screen.getByRole('button', { name: 'Continue with Google' }).click();
    expect(mocks.initOAuth).toHaveBeenCalledWith({ provider: 'google', disableSignup: true });
  });

  it('does not offer passkey account creation on Sign up', async () => {
    const screen = await renderSurface('sign-up');

    await expect.element(screen.getByRole('button', { name: 'Continue with a passkey' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(mocks.loginWithPasskey).not.toHaveBeenCalled();
  });

  it('keeps email before Google and shows legal notice only on Sign up', async () => {
    const screen = await renderSurface('sign-up');
    const emailAction = screen.getByRole('button', { name: 'Continue with email' });
    const googleAction = screen.getByRole('button', { name: 'Continue with Google' });

    await expect.element(screen.getByRole('heading', { name: 'Sign up to Comitium' })).toBeInTheDocument();
    expect(
      emailAction.element().compareDocumentPosition(googleAction.element()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await expect.element(screen.getByRole('link', { name: 'Terms' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Privacy Notice' })).toBeInTheDocument();
  });

  it('keeps email before Google and omits the legal notice on Sign in', async () => {
    const screen = await renderSurface('sign-in');
    const emailAction = screen.getByRole('button', { name: 'Continue', exact: true });
    const googleAction = screen.getByRole('button', { name: 'Continue with Google' });

    await expect.element(screen.getByText('Don’t have an account?')).toBeInTheDocument();
    expect(
      emailAction.element().compareDocumentPosition(googleAction.element()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await expect.element(screen.getByRole('link', { name: 'Terms' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Privacy Notice' })).not.toBeInTheDocument();
  });

  it('allows account creation from the explicit email signup action', async () => {
    const screen = await renderSurface('sign-up');

    await screen.getByPlaceholder('Email address').fill('new@example.com');
    await screen.getByRole('button', { name: 'Continue with email' }).click();
    expect(mocks.sendCode).toHaveBeenCalledWith({ email: 'new@example.com', disableSignup: false });
  });

  it('allows account creation from the explicit Google signup action', async () => {
    const screen = await renderSurface('sign-up');

    await screen.getByRole('button', { name: 'Continue with Google' }).click();
    expect(mocks.initOAuth).toHaveBeenCalledWith({ provider: 'google', disableSignup: false });
  });

  it('uses only the login passkey hook on Sign in', async () => {
    const screen = await renderSurface('sign-in');

    await screen.getByRole('button', { name: 'Continue with a passkey' }).click();

    expect(mocks.loginWithPasskey).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to signup after a failed passkey sign-in', async () => {
    mocks.loginWithPasskey.mockRejectedValueOnce(new Error('Unknown passkey'));
    const screen = await renderSurface('sign-in');

    await screen.getByRole('button', { name: 'Continue with a passkey' }).click();

    expect(mocks.loginWithPasskey).toHaveBeenCalledTimes(1);
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('We could not sign you in with a passkey. Try again or create an account.');
  });

  it('keeps an unknown email on Sign in behind a generic product error', async () => {
    mocks.loginWithCode.mockRejectedValueOnce(new Error('Account not found'));
    const screen = await renderSurface('sign-in');

    await screen.getByPlaceholder('Email address').fill('unknown@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('123456');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('We could not sign you in. Try again or create an account.');
  });

  it('renders the OAuth callback failure after returning from Google', async () => {
    mocks.oauthState = { status: 'error', error: new Error('oauth_error') };
    const screen = await renderSurface('sign-in');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('We could not sign you in with Google. Try again or create an account.');
  });

  it('preserves the validated destination when switching auth modes', async () => {
    const screen = await renderSurface('sign-in');

    await expect
      .element(screen.getByRole('link', { name: 'Sign up' }))
      .toHaveAttribute('href', '/signup?returnTo=%2Forg%2Fexample');
  });
});
