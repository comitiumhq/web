import type { User } from '@comitium/schemas/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useEncryptionSetup } from '../use-encryption-setup';

const mocks = vi.hoisted(() => ({
  address: '0x1111111111111111111111111111111111111111' as string | undefined,
  ensureSignature: vi.fn(),
  generateAndWrapPersonalKey: vi.fn(),
  signMessage: vi.fn(),
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ address: mocks.address }),
  useSignMessage: () => ({ signMessage: mocks.signMessage }),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: {
    ensureSignature: mocks.ensureSignature,
    generateAndWrapPersonalKey: mocks.generateAndWrapPersonalKey,
  },
}));

const SESSION_QUERY_KEY = ['session', 'did:privy:user-1'] as const;
const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const wrappedKeys = {
  encryptedPersonalKey: {
    v: 1 as const,
    pk: { ek: 'personal-key', iv: 'personal-key-iv' },
    wraps: [
      {
        method: 'wallet_signature' as const,
        kdf: 'signature+share' as const,
        id: `evm:${WALLET_ADDRESS}`,
        ek: 'wrapped-personal-key',
        iv: 'wrapper-iv',
        salt: 'wrapper-salt',
      },
    ],
  },
  publicKey: { v: 1 as const, xwing: 'public-key' },
};
const readyUser = {
  id: 'user-1',
  walletAddress: WALLET_ADDRESS,
  publicKey: wrappedKeys.publicKey,
  encryptedPersonalKey: wrappedKeys.encryptedPersonalKey,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
} satisfies User;

function createWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createQueryClient(initialUser?: User) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryDefaults(SESSION_QUERY_KEY, {
    queryFn: () => client.getQueryData<User | null>(SESSION_QUERY_KEY) ?? null,
  });

  if (initialUser) {
    client.setQueryData(SESSION_QUERY_KEY, initialUser);
  }

  return client;
}

beforeEach(() => {
  mocks.address = '0x1111111111111111111111111111111111111111';
  mocks.ensureSignature.mockReset();
  mocks.ensureSignature.mockResolvedValue('0xsignature');
  mocks.generateAndWrapPersonalKey.mockReset();
  mocks.generateAndWrapPersonalKey.mockResolvedValue(wrappedKeys);
  mocks.signMessage.mockReset();
});

describe('useEncryptionSetup', () => {
  it('initializes the bundle and verifies the refetched session before succeeding', async () => {
    const client = createQueryClient();
    const getUserKeyShare = vi.fn().mockResolvedValue({ keyShare: 'server-share', version: 1 });
    const initializeEncryptionKeyBundle = vi.fn(async () => {
      client.setQueryData(SESSION_QUERY_KEY, readyUser);
    });
    const hook = await renderHook(
      () => useEncryptionSetup({ getUserKeyShare, initializeEncryptionKeyBundle, sessionQueryKey: SESSION_QUERY_KEY }),
      { wrapper: createWrapper(client) },
    );

    await expect(hook.result.current.mutateAsync()).resolves.toBeUndefined();

    expect(mocks.ensureSignature).toHaveBeenCalledWith(mocks.signMessage, '0x1111111111111111111111111111111111111111');
    expect(getUserKeyShare).toHaveBeenCalledTimes(1);
    expect(mocks.generateAndWrapPersonalKey).toHaveBeenCalledWith(
      '0xsignature',
      '0x1111111111111111111111111111111111111111',
      'server-share',
    );
    expect(initializeEncryptionKeyBundle).toHaveBeenCalledExactlyOnceWith(wrappedKeys);
  });

  it('treats a failed initialize request as success when refetch proves the bundle exists', async () => {
    const client = createQueryClient();
    const initializeEncryptionKeyBundle = vi.fn(async () => {
      client.setQueryData(SESSION_QUERY_KEY, readyUser);
      throw new Error('response lost after commit');
    });
    const hook = await renderHook(
      () =>
        useEncryptionSetup({
          getUserKeyShare: vi.fn().mockResolvedValue({ keyShare: 'server-share', version: 1 }),
          initializeEncryptionKeyBundle,
          sessionQueryKey: SESSION_QUERY_KEY,
        }),
      { wrapper: createWrapper(client) },
    );

    await expect(hook.result.current.mutateAsync()).resolves.toBeUndefined();
  });

  it('fails when the session still has no complete key bundle after initialization', async () => {
    const client = createQueryClient({ ...readyUser, encryptedPersonalKey: null });
    const hook = await renderHook(
      () =>
        useEncryptionSetup({
          getUserKeyShare: vi.fn().mockResolvedValue({ keyShare: 'server-share', version: 1 }),
          initializeEncryptionKeyBundle: vi.fn().mockResolvedValue(undefined),
          sessionQueryKey: SESSION_QUERY_KEY,
        }),
      { wrapper: createWrapper(client) },
    );

    await expect(hook.result.current.mutateAsync()).rejects.toThrow('Encryption key bundle was not initialized');
  });

  it('fails before signing when the canonical wallet is absent', async () => {
    mocks.address = undefined;
    const client = createQueryClient();
    const initializeEncryptionKeyBundle = vi.fn();
    const hook = await renderHook(
      () =>
        useEncryptionSetup({
          getUserKeyShare: vi.fn(),
          initializeEncryptionKeyBundle,
          sessionQueryKey: SESSION_QUERY_KEY,
        }),
      { wrapper: createWrapper(client) },
    );

    await expect(hook.result.current.mutateAsync()).rejects.toThrow('Wallet not connected');
    expect(mocks.ensureSignature).not.toHaveBeenCalled();
    expect(initializeEncryptionKeyBundle).not.toHaveBeenCalled();
  });
});
