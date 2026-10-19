import { CryptoProxy } from '@comitium/crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SecuritySettingsPage } from '../account-settings/security-settings-page';
import { encryptedProductUser } from './identity-fixtures';

vi.mock('../use-session', () => ({ useSession: () => ({ user: encryptedProductUser() }) }));
vi.mock('../use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ isCryptoActive: true, refreshSession: async () => {} }),
}));
vi.mock('../fresh-authentication', () => ({
  useConfirmFreshAuthentication: () => async () => {},
}));
vi.mock('../use-logout', () => ({ useAccountLogout: () => async () => true }));

afterEach(() => vi.restoreAllMocks());

describe('security settings', () => {
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
