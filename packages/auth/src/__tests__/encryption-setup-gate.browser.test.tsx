import type { User } from '@comitium/schemas/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { EncryptionSetupGate } from '../encryption-setup-gate';

const mocks = vi.hoisted(() => ({
  session: {
    isSessionLoading: false,
    user: null as User | null,
  },
  wallet: { id: 'wallet-id' } as object | null,
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useActiveWallet: () => mocks.wallet,
}));

function user(id: string, ready: boolean): User {
  return {
    id,
    walletAddress: '0x1111111111111111111111111111111111111111',
    publicKey: ready ? ({ v: 1, xwing: 'public-key' } as User['publicKey']) : null,
    encryptedPersonalKey: ready ? ({ wrapped: true } as unknown as User['encryptedPersonalKey']) : null,
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  };
}

function gate(initializeEncryptionKeyBundle: () => Promise<unknown>, isSuppressed = false) {
  return (
    <EncryptionSetupGate
      error={null}
      initializeEncryptionKeyBundle={initializeEncryptionKeyBundle}
      isSuppressed={isSuppressed}
    >
      <main>Protected application</main>
    </EncryptionSetupGate>
  );
}

beforeEach(() => {
  mocks.session = {
    isSessionLoading: false,
    user: user('user-1', false),
  };
  mocks.wallet = { id: 'wallet-id' };
});

describe('EncryptionSetupGate', () => {
  it('starts setup once per user and keeps protected children hidden until the complete bundle exists', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const screen = await render(gate(initialize));

    await expect.element(screen.getByText('Protected application')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));

    await screen.rerender(gate(initialize));
    expect(initialize).toHaveBeenCalledTimes(1);

    mocks.session = { isSessionLoading: false, user: user('user-1', true) };
    await screen.rerender(gate(initialize));
    await expect.element(screen.getByText('Protected application')).toBeInTheDocument();
  });

  it('allows a different user to start its own setup', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const screen = await render(gate(initialize));
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));

    mocks.session = { isSessionLoading: false, user: user('user-2', false) };
    await screen.rerender(gate(initialize));
    await vi.waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
  });

  it('does not start setup on intentionally suppressed routes', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const screen = await render(gate(initialize, true));

    await expect.element(screen.getByText('Protected application')).toBeInTheDocument();
    expect(initialize).not.toHaveBeenCalled();
  });
});
