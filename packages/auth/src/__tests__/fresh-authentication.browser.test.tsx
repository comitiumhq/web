import { UnlockApiError } from '@comitium/crypto';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { createIdentityClient } from '../auth-client';
import { AuthClientContext, useAuthClient } from '../auth-context';
import { FreshAuthentication, useConfirmFreshAuthentication, useFreshAuthentication } from '../fresh-authentication';
import { API_URL, identitySession } from './identity-fixtures';

let fresh: boolean;
let confirmationAge: number;
let passkeys: { id: string }[];
let passkeyReadFails: boolean;

beforeEach(() => {
  fresh = false;
  confirmationAge = 0;
  passkeys = [];
  passkeyReadFails = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path.endsWith('/get-session')) {
        const session = identitySession();
        return Response.json({
          ...session,
          session: {
            ...session.session,
            interactiveAuthenticatedAt: fresh ? new Date(Date.now() - confirmationAge).toISOString() : null,
          },
        });
      }

      if (path.endsWith('/sign-in/email-otp')) {
        return Response.json({ user: identitySession().user });
      }

      if (path.endsWith('/passkey/list-user-passkeys')) {
        return passkeyReadFails ? new Response(null, { status: 503 }) : Response.json(passkeys);
      }

      return Response.json({ success: true });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function CryptoOperation({
  operation,
  preflight = false,
  concurrent = false,
}: {
  operation: () => Promise<void>;
  preflight?: boolean;
  concurrent?: boolean;
}) {
  const client = useAuthClient();
  const { data } = client.useSession();
  const runWithFreshAuth = useFreshAuthentication();
  const confirmFreshAuth = useConfirmFreshAuthentication();
  const [result, setResult] = useState('idle');

  async function submit() {
    setResult('pending');

    try {
      if (preflight) {
        await confirmFreshAuth();
        await operation();
      } else if (concurrent) {
        await Promise.all([runWithFreshAuth(operation), runWithFreshAuth(operation)]);
      } else {
        await runWithFreshAuth(operation);
      }

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

async function renderOperation(operation: () => Promise<void>, preflight = false) {
  const client = createIdentityClient(API_URL);
  const screen = await render(
    <AuthClientContext.Provider value={client}>
      <FreshAuthentication>
        <CryptoOperation operation={operation} preflight={preflight} />
      </FreshAuthentication>
    </AuthClientContext.Provider>,
  );

  await expect.element(screen.getByRole('button', { name: 'Update key wrappers' })).toBeEnabled();
  await screen.getByRole('button', { name: 'Update key wrappers' }).click();

  return screen;
}

describe('fresh authentication for Worker operations', () => {
  it('keeps email confirmation available when passkey metadata cannot be loaded', async () => {
    passkeyReadFails = true;

    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const screen = await renderOperation(operation, true);
    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });

    await vi.waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).endsWith('/passkey/list-user-passkeys'))).toBe(
        true,
      );
    });

    await expect.element(confirmation.getByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();

    await confirmation.getByRole('button', { name: 'Send code' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('offers a linked passkey only before choosing email confirmation', async () => {
    passkeys = [{ id: 'linked-passkey' }];

    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const screen = await renderOperation(operation, true);
    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });

    await expect.element(confirmation.getByRole('button', { name: 'Use a passkey' })).toBeEnabled();
    await confirmation.getByRole('button', { name: 'Send code' }).click();

    await expect.element(confirmation.getByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();
    await expect.element(confirmation.getByRole('button', { name: 'Cancel', exact: true })).not.toBeInTheDocument();
    await expect.element(confirmation.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();
    await confirmation.getByRole('button', { name: 'Close', exact: true }).click();

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    expect(operation).not.toHaveBeenCalled();
  });

  it('resends to the same account after cooldown and clears the previous code', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'));
    const screen = await renderOperation(operation);

    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    await screen.getByRole('button', { name: 'Send code' }).click();

    await expect.element(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled();

    await screen.getByLabelText('Verification code').fill('123');

    flushSync(() => vi.advanceTimersByTime(60_000));

    await screen.getByRole('button', { name: 'Resend code', exact: true }).click();

    await expect.element(screen.getByLabelText('Verification code')).toHaveValue('');

    const sends = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) => String(input).endsWith('/email-otp/send-verification-otp'));

    expect(sends).toHaveLength(2);

    for (const [, options] of sends) {
      expect(JSON.parse(String(options?.body))).toEqual({ email: 'person@example.com', type: 'sign-in' });
    }

    expect(operation).toHaveBeenCalledTimes(1);

    await screen.getByRole('button', { name: 'Close', exact: true }).click();

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
  });

  it('shares one confirmation between concurrent operations', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockResolvedValue(undefined);
    const client = createIdentityClient(API_URL);
    const screen = await render(
      <AuthClientContext.Provider value={client}>
        <FreshAuthentication>
          <CryptoOperation operation={operation} concurrent />
        </FreshAuthentication>
      </AuthClientContext.Provider>,
    );
    const button = screen.getByRole('button', { name: 'Update key wrappers' });

    await expect.element(button).toBeEnabled();
    await button.click();

    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });
    expect(confirmation.elements()).toHaveLength(1);
    await confirmation.getByRole('button', { name: 'Send code' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('allows another confirmation after the previous request was cancelled', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockResolvedValue(undefined);
    const screen = await renderOperation(operation);

    await screen.getByRole('button', { name: 'Close', exact: true }).click();
    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    await screen.getByRole('button', { name: 'Update key wrappers' }).click();

    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });
    await confirmation.getByRole('button', { name: 'Send code' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('checks sign-in before starting a prepared storage mutation', async () => {
    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const screen = await renderOperation(operation, true);
    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });

    await expect.element(confirmation).toBeVisible();
    await expect.element(confirmation.getByRole('button', { name: 'Use a passkey' })).not.toBeInTheDocument();
    expect(operation).not.toHaveBeenCalled();

    await confirmation.getByRole('button', { name: 'Send code' }).click();
    await confirmation.getByLabelText('Verification code').fill('123456');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('reuses confirmation at the two-hour boundary without asking again', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-20T12:00:00Z'));

    fresh = true;
    confirmationAge = 2 * 60 * 60 * 1000;

    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const screen = await renderOperation(operation, true);

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('saved');
    expect(operation).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([2 * 60 * 60 * 1000 + 1, -1])(
    'requests confirmation for expired or future evidence (age: %s ms)',
    async (age) => {
      vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-20T12:00:00Z'));

      fresh = true;
      confirmationAge = age;

      const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const screen = await renderOperation(operation, true);

      await expect.element(screen.getByRole('dialog', { name: 'Verify It’s You' })).toBeVisible();
      expect(operation).not.toHaveBeenCalled();
      await screen.getByRole('button', { name: 'Close', exact: true }).click();
      await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    },
  );

  it('does not begin a storage mutation when preflight confirmation is cancelled', async () => {
    const operation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const screen = await renderOperation(operation, true);

    await expect.element(screen.getByRole('dialog', { name: 'Verify It’s You' })).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    expect(operation).not.toHaveBeenCalled();
  });

  it('confirms the same user by OTP and retries a stale Worker operation once', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'))
      .mockResolvedValue(undefined);
    const screen = await renderOperation(operation);
    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });

    await expect.element(confirmation).toBeInTheDocument();
    expect(operation).toHaveBeenCalledOnce();
    await confirmation.getByRole('button', { name: 'Send code' }).click();
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
      .getByRole('dialog', { name: 'Verify It’s You' })
      .getByRole('button', { name: 'Close', exact: true })
      .click();

    await expect.element(screen.getByLabelText('Operation result')).toHaveTextContent('failed');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('does not start another confirmation when the single retry is rejected', async () => {
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new UnlockApiError(403, 'FRESH_AUTHENTICATION_REQUIRED'));
    const screen = await renderOperation(operation);
    const confirmation = screen.getByRole('dialog', { name: 'Verify It’s You' });

    await confirmation.getByRole('button', { name: 'Send code' }).click();
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
    await expect.element(screen.getByRole('dialog', { name: 'Verify It’s You' })).not.toBeInTheDocument();
    expect(operation).toHaveBeenCalledOnce();
  });
});
