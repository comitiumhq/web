import { ApiError } from '@comitium/schemas/api-errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendSignInCode, signInWithGoogle, verifySignInCode } from '../auth-actions';
import { createIdentityClient } from '../auth-client';
import { unwrapAuthResult } from '../auth-result';
import { refreshIdentitySession } from '../fresh-auth-session';
import { API_URL, identitySession } from './identity-fixtures';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ success: true }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastRequest() {
  const [input, options] = fetchMock.mock.calls.at(-1) ?? [];

  if (!input || !options) {
    throw new Error('Expected a native auth request');
  }

  return {
    url: new URL(String(input)),
    options,
    body: options.body ? JSON.parse(String(options.body)) : null,
  };
}

describe('native auth client transport', () => {
  it('uses cookie-authenticated native OTP requests without custom modes', async () => {
    const client = createIdentityClient(API_URL);

    await sendSignInCode(client, 'person@example.com');

    let request = lastRequest();

    expect(request.url.pathname).toBe('/v1/auth/identity/email-otp/send-verification-otp');
    expect(request.url.search).toBe('');
    expect(request.body).toEqual({ email: 'person@example.com', type: 'sign-in' });
    expect(request.options.credentials).toBe('include');
    expect(request.options.cache).toBe('no-store');
    expect(new Headers(request.options.headers).has('Authorization')).toBe(false);

    fetchMock.mockResolvedValueOnce(Response.json({ user: identitySession().user }));

    await verifySignInCode(client, 'person@example.com', '123456');

    request = lastRequest();

    expect(request.url.pathname).toBe('/v1/auth/identity/sign-in/email-otp');
    expect(request.url.search).toBe('');
    expect(request.body).toEqual({ email: 'person@example.com', otp: '123456' });
  });

  it('uses the native Google sign-in-or-up flow and preserves callbacks', async () => {
    const client = createIdentityClient(`${API_URL}/`);
    const callbackURL = 'https://app.comitium.test/org/example';
    const errorCallbackURL = 'https://app.comitium.test/login?returnTo=%2Forg%2Fexample';

    fetchMock.mockResolvedValueOnce(Response.json({ redirect: false, url: 'https://accounts.google.com/' }));

    await signInWithGoogle(client, callbackURL, errorCallbackURL);

    const request = lastRequest();

    expect(request.url.pathname).toBe('/v1/auth/identity/sign-in/social');
    expect(request.body).toMatchObject({
      provider: 'google',
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL,
    });
    expect(request.body).not.toHaveProperty('requestSignUp');
  });

  it('keeps normal session refresh enabled on the native endpoint', async () => {
    const client = createIdentityClient(API_URL);

    fetchMock.mockResolvedValueOnce(Response.json(identitySession()));

    unwrapAuthResult(await client.getSession());

    const request = lastRequest();

    expect(request.url.pathname).toBe('/v1/auth/identity/get-session');
    expect(request.url.searchParams.has('disableRefresh')).toBe(false);
  });

  it('settles concurrent session readers when the SDK replaces an in-flight refresh', async () => {
    const client = createIdentityClient(API_URL);
    let finishFirst!: (response: Response) => void;

    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finishFirst = resolve;
        }),
    );

    const first = refreshIdentitySession(client);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    fetchMock.mockResolvedValueOnce(Response.json(identitySession()));

    const second = refreshIdentitySession(client);

    await expect(first).resolves.toMatchObject({ user: identitySession().user });
    await expect(second).resolves.toMatchObject({ user: identitySession().user });

    finishFirst(Response.json(null));
  });

  it('preserves safe native error metadata without exposing provider messages', async () => {
    const client = createIdentityClient(API_URL);

    fetchMock.mockResolvedValueOnce(
      Response.json({ code: 'FRESH_AUTHENTICATION_REQUIRED', message: 'Private provider details' }, { status: 403 }),
    );

    const result = await client.emailOtp.requestEmailChange({ newEmail: 'next@example.com' });

    expect(() => unwrapAuthResult(result)).toThrow(ApiError);
    expect(() => unwrapAuthResult(result)).toThrow('Authentication request failed');

    try {
      unwrapAuthResult(result);
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: 'FRESH_AUTHENTICATION_REQUIRED' });
      expect(String(error)).not.toContain('Private provider details');
    }
  });
});
