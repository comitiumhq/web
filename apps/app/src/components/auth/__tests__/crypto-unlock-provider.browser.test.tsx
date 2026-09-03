import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import type { User } from '@comitium/schemas/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { CryptoUnlockProvider } from '../crypto-unlock-provider';

const mocks = vi.hoisted(() => ({
  isActiveFor: false,
  isAnyCryptoSessionActive: false,
  logout: vi.fn(),
  unlock: vi.fn(),
  user: null as User | null,
  wallet: {
    address: '0x1111111111111111111111111111111111111111',
    id: 'wallet-id',
  } as { address: string; id: string } | null,
}));

vi.mock('@comitium/auth/account-api', () => ({
  createAuthAccountApi: () => ({ getUserKeyShare: vi.fn() }),
}));

vi.mock('@comitium/auth/use-crypto-reset-listener', () => ({
  useCryptoResetListener: vi.fn(),
}));

vi.mock('@comitium/auth/use-is-crypto-active', () => ({
  useIsCryptoActive: () => mocks.isAnyCryptoSessionActive,
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ user: mocks.user }),
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ address: mocks.wallet?.address, wallet: mocks.wallet }),
  useSignMessage: () => ({ signMessage: vi.fn() }),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    isActiveFor: () => mocks.isActiveFor,
    unlock: mocks.unlock,
  },
}));

vi.mock('@comitium/ui/logger', () => ({
  logger: { warn: vi.fn() },
}));

vi.mock('@/hooks/use-logout', () => ({
  useLogout: () => mocks.logout,
}));

function readyUser(): User {
  return {
    id: 'user-1',
    walletAddress: '0x1111111111111111111111111111111111111111',
    publicKey: { v: 1, xwing: 'public-key' } as User['publicKey'],
    encryptedPersonalKey: { wrapped: true } as unknown as User['encryptedPersonalKey'],
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  };
}

function UnlockProbe() {
  const { requestUnlock } = useCryptoUnlock();

  return (
    <button type="button" onClick={() => requestUnlock().catch(() => undefined)}>
      Unlock
    </button>
  );
}

beforeEach(() => {
  mocks.isActiveFor = false;
  mocks.isAnyCryptoSessionActive = false;
  mocks.logout.mockReset();
  mocks.logout.mockResolvedValue(true);
  mocks.unlock.mockReset();
  mocks.unlock.mockResolvedValue(undefined);
  mocks.user = readyUser();
  mocks.wallet = {
    address: '0x1111111111111111111111111111111111111111',
    id: 'wallet-id',
  };
});

describe('CryptoUnlockProvider identity lifecycle', () => {
  it('logs out a mismatched active crypto identity without attempting to unlock the new identity', async () => {
    mocks.isAnyCryptoSessionActive = true;
    const screen = await render(
      <CryptoUnlockProvider>
        <UnlockProbe />
      </CryptoUnlockProvider>,
    );

    await vi.waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    expect(mocks.unlock).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Unlock' }).click();
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it('does not unlock again when the active crypto session already matches the account', async () => {
    mocks.isAnyCryptoSessionActive = true;
    mocks.isActiveFor = true;
    const screen = await render(
      <CryptoUnlockProvider>
        <UnlockProbe />
      </CryptoUnlockProvider>,
    );

    await screen.getByRole('button', { name: 'Unlock' }).click();

    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it('automatically unlocks a ready account with no active crypto session', async () => {
    await render(
      <CryptoUnlockProvider>
        <UnlockProbe />
      </CryptoUnlockProvider>,
    );

    await vi.waitFor(() => expect(mocks.unlock).toHaveBeenCalledTimes(1));
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
