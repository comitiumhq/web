import { CryptoProxy } from '@comitium/crypto';
import type { User } from '@comitium/schemas/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SecuritySettingsPage } from '../account-settings/security/security-settings-page';
import { encryptedProductUser, productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({ user: null as User | null, isCryptoActive: true }));

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ isCryptoActive: mocks.isCryptoActive, refreshSession: async () => {} }),
}));
vi.mock('../fresh-authentication', () => ({
  useConfirmFreshAuthentication: () => async () => {},
}));
vi.mock('../use-logout', () => ({ useAccountLogout: () => async () => true }));

beforeEach(() => {
  mocks.user = encryptedProductUser();
  mocks.isCryptoActive = true;
});
afterEach(() => vi.restoreAllMocks());

async function renderSettings() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SecuritySettingsPage />
    </QueryClientProvider>,
  );
}

describe('security settings', () => {
  it('hides personal encryption activation for a keyless candidate', async () => {
    mocks.user = productUser();
    const screen = await renderSettings();
    await expect.element(screen.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    await expect.element(screen.getByRole('heading', { name: 'Data protection' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Create a password' })).not.toBeInTheDocument();
  });

  it('allows password-only members to create a recovery kit later', async () => {
    const user = encryptedProductUser();
    mocks.user = {
      ...user,
      encryptedUserKey: {
        ...user.encryptedUserKey,
        wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
      },
    };
    const screen = await renderSettings();
    await screen.getByRole('button', { name: 'Create recovery kit' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Create a recovery kit' })).toBeVisible();
    await expect.element(screen.getByLabelText('Current password', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('Enter your current password to continue.')).toBeVisible();
    await screen.getByRole('button', { name: 'Back', exact: true }).click();
    await expect.element(screen.getByRole('button', { name: 'Create recovery kit' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Reset storage keys' })).not.toBeInTheDocument();
  });

  it('explains that an existing recovery kit is replaced rather than downloaded again', async () => {
    const screen = await renderSettings();
    await expect.element(screen.getByRole('button', { name: 'Replace recovery kit' })).toBeVisible();
    await expect.element(screen.getByText('A new kit replaces your previous recovery code.')).toBeVisible();
    await screen.getByRole('button', { name: 'Replace recovery kit' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Replace recovery kit' })).toBeVisible();
    await expect.element(screen.getByLabelText('Current password', { exact: true })).toBeVisible();
  });

  it.each([false, true])('offers password recovery without a kit only when data is unlocked (%s)', async (unlocked) => {
    const user = encryptedProductUser();
    mocks.user = {
      ...user,
      encryptedUserKey: {
        ...user.encryptedUserKey,
        wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
      },
    };
    mocks.isCryptoActive = unlocked;
    const screen = await renderSettings();
    const recovery = screen.getByRole('button', { name: 'Forgot password?' });

    if (unlocked) {
      await recovery.click();
      await expect.element(screen.getByRole('heading', { name: 'Create a new password' })).toBeVisible();
      await expect.element(screen.getByLabelText('Recovery code', { exact: true })).not.toBeInTheDocument();
    } else {
      await expect.element(recovery).not.toBeInTheDocument();
    }
  });

  it.each([false, true])('clears private queries when forgetting a device (revocation fails: %s)', async (fails) => {
    const user = encryptedProductUser();
    const forget = vi.spyOn(CryptoProxy, 'forgetRememberedDevice');

    if (fails) {
      forget.mockRejectedValue(new TypeError('Network unavailable'));
    } else {
      forget.mockResolvedValue(undefined);
    }

    const client = new QueryClient();
    client.setQueryData(['private'], 'decrypted data');

    const screen = await render(
      <QueryClientProvider client={client}>
        <SecuritySettingsPage />
      </QueryClientProvider>,
    );

    await screen.getByRole('button', { name: 'Forget this device' }).click();
    await vi.waitFor(() => expect(client.getQueryData(['private'])).toBeUndefined());
    expect(forget).toHaveBeenCalledWith(user.encryptedUserKey, user.id, user.publicKey);

    if (fails) {
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not connect');
    }
  });
});
