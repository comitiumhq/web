import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthenticationSettingsPage } from '../account-settings/authentication-settings-page';
import { createIdentityClient, type IdentityClient } from '../auth-client';
import { AuthClientContext } from '../auth-context';
import { FreshAuthentication } from '../fresh-authentication';
import { API_URL, identitySession, OTHER_AUTH_USER_ID } from './identity-fixtures';

let client: IdentityClient;
let current: ReturnType<typeof identitySession>;
let googleLinked: boolean;
let passkeys: { id: string }[];
let freshRequired: boolean;
let failure: { path: string; status: number; code: string } | null;
let requests: { path: string; body: Record<string, unknown> | null }[];
let otpResponse: Promise<Response> | null;
let originalURL: string;

beforeEach(() => {
  current = identitySession();
  googleLinked = true;
  passkeys = [{ id: 'first' }];
  freshRequired = false;
  failure = null;
  requests = [];
  otpResponse = null;
  originalURL = window.location.href;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = new URL(String(input)).pathname.split('/identity')[1];
      const body = options?.body ? JSON.parse(String(options.body)) : null;

      requests.push({ path, body });

      if (failure?.path === path) {
        return Response.json({ code: failure.code }, { status: failure.status });
      }

      if (path === '/get-session') {
        return Response.json(current);
      }

      if (path === '/list-accounts') {
        return Response.json(
          googleLinked ? [{ id: 'google-row-id', providerId: 'google', accountId: 'external-subject' }] : [],
        );
      }

      if (path === '/passkey/list-user-passkeys') {
        return Response.json(passkeys);
      }

      if (path === '/sign-in/email-otp') {
        freshRequired = false;

        return otpResponse ?? Response.json({ user: current.user });
      }

      if (
        freshRequired &&
        [
          '/link-social',
          '/unlink-account',
          '/email-otp/request-email-change',
          '/email-otp/change-email',
          '/passkey/generate-register-options',
        ].includes(path)
      ) {
        return Response.json({ code: 'FRESH_AUTHENTICATION_REQUIRED' }, { status: 403 });
      }

      if (path === '/email-otp/change-email') {
        current.user.email = String(body.newEmail);
        current.user.emailVerified = true;
      }

      if (path === '/unlink-account') {
        googleLinked = false;
      }

      if (path === '/passkey/generate-register-options') {
        return Response.json({
          challenge: 'AQID',
          rp: { id: 'localhost', name: 'Comitium' },
          user: { id: 'AQID', name: current.user.email, displayName: '' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        });
      }

      if (path === '/passkey/verify-registration') {
        passkeys.push({ id: 'new-passkey' });

        return Response.json({ id: 'new-passkey' });
      }

      return Response.json({ success: true });
    }),
  );
});

afterEach(() => {
  window.history.replaceState(null, '', originalURL);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderSettings() {
  client = createIdentityClient(API_URL);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <AuthClientContext.Provider value={client}>
        <FreshAuthentication>
          <AuthenticationSettingsPage queryKey={(id) => ['auth', 'methods', id]} />
        </FreshAuthentication>
      </AuthClientContext.Provider>
    </QueryClientProvider>,
  );

  await expect.element(screen.getByRole('heading', { name: 'Authentication' })).toBeInTheDocument();

  return screen;
}

describe('native Authentication settings', () => {
  it('renders verified email, connected Google and multiple passkeys', async () => {
    const screen = await renderSettings();

    await expect.element(screen.getByText('person@example.com', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText('Connected', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText('1 passkey', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Add another' })).toBeEnabled();
  });

  it('shows personal email guidance on hover', async () => {
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Email access guidance' }).hover();

    await expect
      .element(screen.getByRole('tooltip'))
      .toHaveTextContent('For long-term access, use an email you personally control.');
  });

  it('does not toggle email guidance on click', async () => {
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Email access guidance' }).click();

    await expect.element(screen.getByRole('tooltip')).not.toBeInTheDocument();
  });

  it('requires verified email OTP before removing Google', async () => {
    current.user.emailVerified = false;
    const screen = await renderSettings();

    await expect.element(screen.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();
    await expect.element(screen.getByText('Add an email before removing Google.')).toBeInTheDocument();
  });

  it('changes the primary email and reads back the result before closing the dialog', async () => {
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Change', exact: true }).click();
    await screen.getByLabelText('Email address', { exact: true }).fill('next@example.com');
    await screen.getByRole('button', { name: 'Send code', exact: true }).click();
    await screen.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByText('next@example.com', { exact: true })).toBeInTheDocument();
    expect(requests.find((request) => request.path === '/email-otp/request-email-change')?.body).toEqual({
      newEmail: 'next@example.com',
    });
    expect(requests.find((request) => request.path === '/email-otp/change-email')?.body).toEqual({
      newEmail: 'next@example.com',
      otp: '123456',
    });
  });

  it('clears verification errors before retrying an email change', async () => {
    failure = { path: '/email-otp/change-email', status: 400, code: 'INVALID_OTP' };
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Change', exact: true }).click();
    await screen.getByLabelText('Email address', { exact: true }).fill('next@example.com');
    await screen.getByRole('button', { name: 'Send code', exact: true }).click();
    await screen.getByLabelText('Verification code').fill('111111');
    await expect.element(screen.getByRole('alert')).toHaveTextContent('We could not verify this email. Try again.');

    await screen.getByRole('button', { name: 'Change email', exact: true }).click();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Send code', exact: true }).click();
    await expect.element(screen.getByLabelText('Verification code')).toHaveValue('');
  });

  it('keeps the email dialog open when mutation succeeds but metadata readback fails', async () => {
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Change', exact: true }).click();
    await screen.getByLabelText('Email address', { exact: true }).fill('next@example.com');
    await screen.getByRole('button', { name: 'Send code', exact: true }).click();

    failure = { path: '/list-accounts', status: 503, code: 'UNAVAILABLE' };

    await screen.getByLabelText('Verification code').fill('123456');

    await expect
      .element(screen.getByRole('dialog', { name: 'Change email' }).getByRole('alert'))
      .toHaveTextContent('We could not verify this email. Try again.');
  });

  it('shows a Google account conflict without exposing provider details', async () => {
    googleLinked = false;
    failure = { path: '/link-social', status: 409, code: 'SOCIAL_ACCOUNT_ALREADY_LINKED' };
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Add Google', exact: true }).click();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('This Google account is already used by another Comitium account.');
  });

  it('returns Google linking failures to account settings and shows callback conflicts', async () => {
    googleLinked = false;
    window.history.replaceState(null, '', '?error=account_already_linked_to_different_user');
    const screen = await renderSettings();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('This Google account is already used by another Comitium account.');
    await screen.getByRole('button', { name: 'Add Google', exact: true }).click();

    const callbackURL = new URL(window.location.href);

    callbackURL.searchParams.delete('error');

    expect(requests.find((request) => request.path === '/link-social')?.body).toEqual({
      provider: 'google',
      callbackURL: callbackURL.href,
      errorCallbackURL: callbackURL.href,
    });
  });

  it('confirms removal and sends the local Google account row ID', async () => {
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();

    await expect.element(screen.getByRole('button', { name: 'Add Google', exact: true })).toBeInTheDocument();
    expect(requests.find((request) => request.path === '/unlink-account')?.body).toEqual({
      accountId: 'google-row-id',
    });
  });

  it('keeps a failed Google removal actionable in the confirmation dialog', async () => {
    failure = { path: '/unlink-account', status: 503, code: 'UNAVAILABLE' };
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();

    await expect
      .element(screen.getByRole('dialog').getByRole('alert'))
      .toHaveTextContent('We could not remove Google. Try again.');
    await expect.element(screen.getByRole('button', { name: 'Remove Google', exact: true })).toBeEnabled();
  });

  it('adds a passkey through the native browser ceremony and reads back the list', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;

    const credential = {
      id: 'credential',
      type: 'public-key',
      rawId: buffer,
      response: { clientDataJSON: buffer, attestationObject: buffer },
      getClientExtensionResults: () => ({}),
      authenticatorAttachment: 'platform',
    };

    vi.spyOn(navigator.credentials, 'create').mockResolvedValue(credential);

    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Add another', exact: true }).click();

    await expect.element(screen.getByText('2 passkeys', { exact: true })).toBeInTheDocument();
    expect(requests.some((request) => request.path === '/passkey/verify-registration')).toBe(true);
  });

  it('requests same-user OTP only after the server requires fresh auth, then retries the rejected operation', async () => {
    freshRequired = true;
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();

    const confirmation = screen.getByRole('dialog', { name: 'Confirm your sign-in' });

    await expect.element(confirmation).toBeInTheDocument();
    expect(requests.filter((request) => request.path === '/unlink-account')).toHaveLength(1);
    await confirmation.getByRole('button', { name: 'Send code to person@example.com' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByRole('button', { name: 'Add Google', exact: true })).toBeInTheDocument();
    expect(requests.filter((request) => request.path === '/unlink-account')).toHaveLength(2);
    expect(requests.find((request) => request.path === '/sign-in/email-otp')?.body).toEqual({
      email: 'person@example.com',
      otp: '123456',
    });
  });

  it('does not retry an auth mutation when confirmation is cancelled', async () => {
    freshRequired = true;
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();
    await screen
      .getByRole('dialog', { name: 'Confirm your sign-in' })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();

    await expect.element(screen.getByRole('button', { name: 'Remove Google', exact: true })).toBeEnabled();
    expect(requests.filter((request) => request.path === '/unlink-account')).toHaveLength(1);
  });

  it('does not retry after a cancelled OTP verification completes late', async () => {
    freshRequired = true;
    let finishVerification!: (response: Response) => void;

    otpResponse = new Promise((resolve) => {
      finishVerification = resolve;
    });

    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();

    const confirmation = screen.getByRole('dialog', { name: 'Confirm your sign-in' });

    await confirmation.getByRole('button', { name: 'Send code to person@example.com' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');
    await vi.waitFor(() => expect(requests.some((request) => request.path === '/sign-in/email-otp')).toBe(true));
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();

    finishVerification(Response.json({ user: current.user }));

    await expect.element(screen.getByRole('button', { name: 'Remove Google', exact: true })).toBeEnabled();
    expect(requests.filter((request) => request.path === '/unlink-account')).toHaveLength(1);
  });

  it('cancels pending confirmation when the authenticated identity changes', async () => {
    freshRequired = true;
    const screen = await renderSettings();

    await screen.getByRole('button', { name: 'Remove', exact: true }).click();
    await screen.getByRole('button', { name: 'Remove Google', exact: true }).click();
    await expect.element(screen.getByRole('dialog', { name: 'Confirm your sign-in' })).toBeInTheDocument();

    current = identitySession(OTHER_AUTH_USER_ID);

    client.$store.notify('$sessionSignal');

    await expect.element(screen.getByRole('dialog', { name: 'Confirm your sign-in' })).not.toBeInTheDocument();
    expect(requests.filter((request) => request.path === '/unlink-account')).toHaveLength(1);
  });
});
