import type { User } from '@comitium/schemas/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { EncryptionSetupGate } from '../encryption-setup-gate';
import { productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  loading: false,
  crypto: { isCryptoActive: false, isRestoring: false, restoreError: null as string | null },
}));

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user, isSessionLoading: mocks.loading }) }));
vi.mock('../use-crypto-unlock', () => ({ useCryptoUnlock: () => mocks.crypto }));
vi.mock('../use-logout', () => ({ useAccountLogout: () => vi.fn() }));
vi.mock('../storage/storage-access', () => ({ StorageAccess: () => <p>Storage access</p> }));

function gate(suppressed = false) {
  return (
    <EncryptionSetupGate isSuppressed={suppressed}>
      <main>Protected application</main>
    </EncryptionSetupGate>
  );
}

beforeEach(() => {
  mocks.user = productUser();
  mocks.loading = false;
  mocks.crypto = { isCryptoActive: false, isRestoring: false, restoreError: null };
});

describe('ATS storage boundary', () => {
  it('blocks working data for a keyless account and offers explicit setup', async () => {
    const screen = await render(gate());
    await expect.element(screen.getByText('Storage access')).toBeVisible();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  it('waits for remembered-device restoration before asking for a password', async () => {
    mocks.crypto.isRestoring = true;
    const screen = await render(gate());
    await expect.element(screen.getByText('Storage access')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
  });

  it('opens working data when the current user key is active', async () => {
    mocks.crypto.isCryptoActive = true;
    const screen = await render(gate());
    await expect.element(screen.getByText('Protected application')).toBeVisible();
    await expect.element(screen.getByText('Storage access')).not.toBeInTheDocument();
  });

  it('keeps Account, invite and auth routes accessible while locked', async () => {
    const screen = await render(gate(true));
    await expect.element(screen.getByText('Protected application')).toBeVisible();
    await expect.element(screen.getByText('Storage access')).not.toBeInTheDocument();
  });

  it('leaves anonymous route authorization to the auth guard', async () => {
    mocks.user = null;
    const screen = await render(gate());
    await expect.element(screen.getByText('Protected application')).toBeVisible();
  });
});
