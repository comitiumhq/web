import { AuthLoginSurface } from '@comitium/auth/login-surface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  initOAuth: vi.fn(),
  loginWithCode: vi.fn(),
  loginWithPasskey: vi.fn(),
  navigate: vi.fn(),
  nativeSession: null as { user: { id: string; email: string } } | null,
  refetch: vi.fn(),
  sendCode: vi.fn(),
}));
const originalUrl = window.location.href;

vi.mock('@comitium/auth/auth-context', () => ({
  useAuthClient: () => ({
    $store: { atoms: { session: { get: () => ({ data: mocks.nativeSession }) } } },
    useSession: () => ({ refetch: mocks.refetch }),
    emailOtp: { sendVerificationOtp: mocks.sendCode },
    signIn: { emailOtp: mocks.loginWithCode, social: mocks.initOAuth, passkey: mocks.loginWithPasskey },
  }),
}));

function renderSurface() {
  return render(
    <AuthLoginSurface
      defaultReturnTo="/"
      homeHref="/"
      homeLabel="Home"
      navigate={mocks.navigate}
      privacyHref="/privacy"
      returnTo="/org/example"
      session={{ isSessionLoading: false, isSignedIn: false }}
      termsHref="/terms"
    />,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.initOAuth.mockResolvedValue({ data: {}, error: null });
  mocks.loginWithCode.mockResolvedValue({ data: {}, error: null });
  mocks.loginWithPasskey.mockResolvedValue({ data: {}, error: null });
  mocks.sendCode.mockResolvedValue({ data: {}, error: null });
  mocks.refetch.mockResolvedValue(undefined);
  mocks.nativeSession = null;
  window.history.replaceState(null, '', originalUrl);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', originalUrl);
});

describe('unified Log in', () => {
  it('keeps the existing method order and always displays Terms and Privacy', async () => {
    const screen = await renderSurface();
    const emailAction = screen.getByRole('button', { name: 'Continue', exact: true });
    const googleAction = screen.getByRole('button', { name: 'Continue with Google' });

    await expect.element(screen.getByRole('heading', { name: 'Log In to Comitium' })).toBeInTheDocument();
    expect(
      emailAction.element().compareDocumentPosition(googleAction.element()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await expect.element(screen.getByRole('link', { name: 'Terms' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Privacy Notice' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await emailAction.click();

    expect(mocks.sendCode).toHaveBeenCalledWith({ email: 'person@example.com', type: 'sign-in' });
    await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Terms' })).toBeInTheDocument();
  });

  it('uses Google sign-in-or-up and preserves the destination', async () => {
    const screen = await renderSurface();

    await screen.getByRole('button', { name: 'Continue with Google' }).click();

    expect(mocks.initOAuth).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: new URL('/org/example', window.location.origin).href,
      newUserCallbackURL: new URL('/org/example', window.location.origin).href,
      errorCallbackURL: new URL('/login?returnTo=%2Forg%2Fexample', window.location.origin).href,
    });
  });

  it('only calls passkey authentication and never creates an account after failure', async () => {
    mocks.loginWithPasskey.mockResolvedValueOnce({ data: null, error: { status: 401, code: 'PASSKEY_NOT_FOUND' } });
    const screen = await renderSurface();

    await screen.getByRole('button', { name: 'Continue with a passkey' }).click();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('We couldn’t sign you in with this passkey. Continue with email.');
    expect(mocks.loginWithPasskey).toHaveBeenCalledOnce();
    expect(mocks.sendCode).not.toHaveBeenCalled();
    expect(mocks.initOAuth).not.toHaveBeenCalled();
  });

  it('handles unavailable or cancelled passkey selection without claiming the account is missing', async () => {
    mocks.loginWithPasskey.mockResolvedValueOnce({
      data: null,
      error: { status: 400, code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', message: 'Private browser details' },
    });
    const screen = await renderSurface();

    await screen.getByRole('button', { name: 'Continue with a passkey' }).click();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Passkey sign-in wasn’t completed. Try again, or continue with email.');
    await expect.element(screen.getByRole('button', { name: 'Continue with a passkey' })).toBeEnabled();
  });

  it('explains unavailable WebAuthn without opening a credential ceremony', async () => {
    vi.stubGlobal('PublicKeyCredential', undefined);
    const screen = await renderSurface();

    await expect.element(screen.getByRole('button', { name: 'Continue with a passkey' })).toBeDisabled();
    await expect
      .element(screen.getByText('Passkeys aren’t supported in this browser. Continue with email.'))
      .toBeInTheDocument();
    expect(mocks.loginWithPasskey).not.toHaveBeenCalled();
  });

  it.each([
    ['INVALID_OTP', 'This code is incorrect or no longer valid. Use the latest code.'],
    ['OTP_EXPIRED', 'This code has expired. Request a new code.'],
    ['TOO_MANY_ATTEMPTS', 'Too many incorrect attempts. Request a new code.'],
  ])('shows the correct OTP error for %s', async (code, message) => {
    mocks.loginWithCode.mockResolvedValueOnce({ data: null, error: { status: 400, code, message: 'Private details' } });
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('123456');

    await expect.element(screen.getByRole('alert')).toHaveTextContent(message);
    await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).toBeInTheDocument();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('keeps a network failure distinct from an invalid OTP', async () => {
    mocks.loginWithCode.mockRejectedValueOnce(new TypeError('Private network details'));
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('123456');

    await expect.element(screen.getByRole('alert')).toHaveTextContent('We couldn’t complete sign-in. Try again.');
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('recovers a completed sign-in when the verification response was lost', async () => {
    mocks.loginWithCode.mockRejectedValueOnce(new TypeError('Response body lost'));
    mocks.refetch.mockImplementationOnce(async () => {
      mocks.nativeSession = { user: { id: 'confirmed-account', email: 'person@example.com' } };
    });
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('123456');

    await expect.element(screen.getByText('Signing you in')).toBeInTheDocument();
    expect(mocks.loginWithCode).toHaveBeenCalledOnce();
  });

  it('clears the old OTP only after a successful resend', async () => {
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('12');
    await screen.getByRole('button', { name: 'Resend code' }).click();

    await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).toHaveValue('');
    expect(mocks.sendCode).toHaveBeenCalledTimes(2);
  });

  it('returns to the email step without sending another code or losing the address', async () => {
    const screen = await renderSurface();
    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Verification code' }).fill('12');
    await screen.getByRole('button', { name: 'Back', exact: true }).click();

    await expect.element(screen.getByPlaceholder('Email address')).toHaveValue('person@example.com');
    await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).not.toBeInTheDocument();
    expect(mocks.sendCode).toHaveBeenCalledOnce();
    expect(mocks.loginWithCode).not.toHaveBeenCalled();
  });

  it('prevents duplicate requests while sending a code', async () => {
    let finishSend!: () => void;

    mocks.sendCode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSend = () => resolve({ data: {}, error: null });
        }),
    );
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect.element(screen.getByRole('button', { name: 'Sending code...' })).toBeDisabled();
    expect(mocks.sendCode).toHaveBeenCalledOnce();

    finishSend();

    await expect.element(screen.getByRole('textbox', { name: 'Verification code' })).toBeInTheDocument();
    expect(mocks.sendCode).toHaveBeenCalledOnce();
  });

  it('retains the email after a failed send and allows another attempt', async () => {
    mocks.sendCode.mockResolvedValueOnce({ data: null, error: { status: 503 } });
    const screen = await renderSurface();

    await screen.getByPlaceholder('Email address').fill('person@example.com');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('We couldn’t request a verification code. Try again.');
    await expect.element(screen.getByPlaceholder('Email address')).toHaveValue('person@example.com');
    await expect.element(screen.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  });

  it('maps Google callback errors to product text', async () => {
    window.history.replaceState(null, '', '?error=access_denied&error_description=Private-provider-details');
    const screen = await renderSurface();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Google sign-in wasn’t completed. Try again or continue with email.');
    await expect.element(screen.getByText('Private-provider-details')).not.toBeInTheDocument();
  });
});
