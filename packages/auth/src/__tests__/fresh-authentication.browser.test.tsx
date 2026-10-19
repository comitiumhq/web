import { UnlockApiError } from '@comitium/crypto';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { createIdentityClient } from '../auth-client';
import { AuthClientContext, useAuthClient } from '../auth-context';
import { FreshAuthentication, useFreshAuthentication } from '../fresh-authentication';
import { API_URL, identitySession } from './identity-fixtures';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path.endsWith('/get-session')) {
        return Response.json(identitySession());
      }

      if (path.endsWith('/sign-in/email-otp')) {
        return Response.json({ user: identitySession().user });
      }

      return Response.json({ success: true });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function CryptoOperation({ operation }: { operation: () => Promise<void> }) {
  const client = useAuthClient();
  const { data } = client.useSession();
  const runWithFreshAuth = useFreshAuthentication();
  const [result, setResult] = useState('idle');

  async function submit() {
    setResult('pending');

    try {
      await runWithFreshAuth(operation);

      setResult('saved');
    } catch {
      setResult('failed');
    }
  }

  return (
    <>
      <button type="button" disabled={!data || result === 'pending'} onClick={submit}>
        Update key wrappers
      </button>
      <output aria-label="Operation result">{result}</output>
    </>
  );
}

async function renderOperation(operation: () => Promise<void>) {
  const client = createIdentityClient(API_URL);
  const screen = await render(
    <AuthClientContext.Provider value={client}>
      <FreshAuthentication>
        <CryptoOperation operation={operation} />
      </FreshAuthentication>
    </AuthClientContext.Provider>,
  );

  await expect.element(screen.getByRole('button', { name: 'Update key wrappers' })).toBeEnabled();
  await screen.getByRole('button', { name: 'Update key wrappers' }).click();

  return screen;
}

describe('fresh authentication for Worker operations', () => {
  it('confirms the same user by OTP and retries a stale Worker operation once', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockResolvedValue(undefined);
    const screen = await renderOperation(operation);
    const confirmation = screen.getByRole('dialog', { name: 'Confirm your sign-in' });

    await expect.element(confirmation).toBeInTheDocument();
    expect(operation).toHaveBeenCalledOnce();
    await confirmation.getByRole('button', { name: 'Send code to person@example.com' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry a Worker operation after cancellation', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'));
    const screen = await renderOperation(operation);

    await screen
      .getByRole('dialog', { name: 'Confirm your sign-in' })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('does not start another confirmation when the single retry is rejected', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'));
    const screen = await renderOperation(operation);
    const confirmation = screen.getByRole('dialog', { name: 'Confirm your sign-in' });

    await confirmation.getByRole('button', { name: 'Send code to person@example.com' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    await expect.element(confirmation).not.toBeInTheDocument();
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it.each([
    new UnlockApiError(403),
    new UnlockApiError(503, 'KEY_SHARE_UNAVAILABLE'),
    { status: 403, code: 'FRESH_AUTHENTICATION_REQUIRED' },
  ])('does not request fresh auth for an unrelated or untyped failure: %j', async (error) => {
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    const screen = await renderOperation(operation);

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    await expect.element(screen.getByRole('dialog', { name: 'Confirm your sign-in' })).not.toBeInTheDocument();
    expect(operation).toHaveBeenCalledOnce();
  });
});
