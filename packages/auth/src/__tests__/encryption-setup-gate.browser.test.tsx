import type { User } from '@comitium/schemas/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { EncryptionSetupGate } from '../encryption-setup-gate';
import { encryptedProductUser, productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  loading: false,
  crypto: { isCryptoActive: false, isRestoring: false, restoreError: null as string | null },
}));

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user, isSessionLoading: mocks.loading }) }));
vi.mock('../use-crypto-unlock', () => ({ useCryptoUnlock: () => mocks.crypto }));
vi.mock('../use-logout', () => ({ useAccountLogout: () => vi.fn() }));
vi.mock('../storage/storage-access', () => ({
  StorageAccess: ({ requireRecovery, initialMode }: { requireRecovery: boolean; initialMode?: string }) => {
    if (initialMode === 'recovery-kit') {
      return <p>Create recovery kit</p>;
    }

    return <p>{requireRecovery ? 'Password and kit' : 'Password only'}</p>;
  },
}));

function gate(suppressed = false, requireRecovery = false) {
  return (
    <EncryptionSetupGate isSuppressed={suppressed} requireRecovery={requireRecovery}>
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
    await expect.element(screen.getByText('Password only')).toBeVisible();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect.element(screen.getByRole('link', { name: 'Account settings' })).not.toBeInTheDocument();
  });

  it('keeps account settings available while an existing user key is locked', async () => {
    mocks.user = encryptedProductUser();
    const screen = await render(gate());

    await expect.element(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute('href', '/account');
    await expect.element(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
  });

  it('waits for remembered-device restoration before asking for a password', async () => {
    mocks.crypto.isRestoring = true;
    const screen = await render(gate());
    await expect.element(screen.getByText('Password only')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
  });

  it('opens working data when the current user key is active', async () => {
    mocks.crypto.isCryptoActive = true;
    const screen = await render(gate());
    await expect.element(screen.getByText('Protected application')).toBeVisible();
    await expect.element(screen.getByText('Password only')).not.toBeInTheDocument();
  });

  it('keeps Account, invite and auth routes accessible while locked', async () => {
    const screen = await render(gate(true));
    await expect.element(screen.getByText('Protected application')).toBeVisible();
    await expect.element(screen.getByText('Password only')).not.toBeInTheDocument();
  });

  it('leaves anonymous route authorization to the auth guard', async () => {
    mocks.user = null;
    const screen = await render(gate());
    await expect.element(screen.getByText('Protected application')).toBeVisible();
  });

  it('requires password and recovery kit when creating an organization', async () => {
    const screen = await render(gate(false, true));
    await expect.element(screen.getByText('Password and kit')).toBeVisible();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
  });

  it('requires a kit when an unlocked password-only user creates an organization', async () => {
    const user = encryptedProductUser();
    mocks.user = {
      ...user,
      encryptedUserKey: {
        ...user.encryptedUserKey,
        wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
      },
    };
    mocks.crypto.isCryptoActive = true;
    const screen = await render(gate(false, true));
    await expect.element(screen.getByText('Create recovery kit')).toBeVisible();
    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Account settings' })).not.toBeInTheDocument();
  });

  it('does not ask an unlocked creator to save an existing recovery kit again', async () => {
    mocks.user = encryptedProductUser();
    mocks.crypto.isCryptoActive = true;
    const screen = await render(gate(false, true));
    await expect.element(screen.getByText('Protected application')).toBeVisible();
    await expect.element(screen.getByText('Create recovery kit')).not.toBeInTheDocument();
  });
});
