import { CryptoProxy } from '@comitium/crypto';
import type { User } from '@comitium/schemas/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { CryptoProvider } from '../crypto-provider';
import type { SessionEvent } from '../schemas/identity';
import { useCryptoUnlock } from '../use-crypto-unlock';
import { API_URL, encryptedProductUser, productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  active: false,
  activeUserId: null as string | null,
  listeners: new Set<() => void>(),
  eventHandler: null as ((event: SessionEvent) => void) | null,
}));

vi.mock('@comitium/crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@comitium/crypto')>()),
  CryptoProxy: {
    init: vi.fn(),
    destroy: vi.fn(),
    reset: vi.fn(),
    isActive: () => mocks.active,
    isActiveFor: (_wrapped: unknown, userId: string) => mocks.active && mocks.activeUserId === userId,
    subscribe: (listener: () => void) => {
      mocks.listeners.add(listener);
      return () => mocks.listeners.delete(listener);
    },
    tryUnlockWithRememberedDevice: vi.fn(),
  },
}));
vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../session-events', () => ({
  publishSessionEvent: vi.fn(),
  subscribeSessionEvents: (handle: (event: SessionEvent) => void) => {
    mocks.eventHandler = handle;
    return () => {
      mocks.eventHandler = null;
    };
  },
}));
vi.mock('../storage/storage-access', () => ({
  StorageAccess: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      Finish storage access
    </button>
  ),
}));

let unlock: () => Promise<void>;

function Probe() {
  const state = useCryptoUnlock();
  unlock = state.ensureUnlocked;

  return (
    <output aria-label="Crypto state">
      {state.isRestoring ? 'restoring' : 'ready'}:{String(state.isCryptoActive)}
    </output>
  );
}

function tree(queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <CryptoProvider apiUrl={API_URL} sessionQueryKey={['session']}>
        <Probe />
        <p>Candidate application list</p>
      </CryptoProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = encryptedProductUser();
  mocks.active = false;
  mocks.activeUserId = null;
  vi.mocked(CryptoProxy.tryUnlockWithRememberedDevice).mockResolvedValue(false);
});

describe('shared crypto lifecycle', () => {
  it('does not demand personal setup for a keyless candidate', async () => {
    mocks.user = productUser();
    const screen = await render(tree(new QueryClient()));

    await expect.element(screen.getByLabelText('Crypto state')).toHaveTextContent('ready:false');
    await expect.element(screen.getByText('Candidate application list')).toBeVisible();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    expect(CryptoProxy.tryUnlockWithRememberedDevice).not.toHaveBeenCalled();
  });

  it('tries remembered access once and opens no password dialog after success', async () => {
    vi.mocked(CryptoProxy.tryUnlockWithRememberedDevice).mockImplementation(async () => {
      mocks.active = true;
      mocks.activeUserId = mocks.user?.id ?? null;
      for (const notify of mocks.listeners) notify();
      return true;
    });
    const client = new QueryClient();
    const screen = await render(tree(client));

    await expect.element(screen.getByLabelText('Crypto state')).toHaveTextContent('ready:true');
    await unlock();
    await screen.rerender(tree(client));
    expect(CryptoProxy.tryUnlockWithRememberedDevice).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('shares one explicit unlock dialog between concurrent encrypted actions', async () => {
    const screen = await render(tree(new QueryClient()));
    await expect.element(screen.getByLabelText('Crypto state')).toHaveTextContent('ready:false');
    const first = unlock();
    const second = unlock();

    await expect.element(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Finish storage access' }).elements()).toHaveLength(1);
    await screen.getByRole('button', { name: 'Finish storage access' }).click();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('cancels a pending unlock when the authenticated account changes', async () => {
    const client = new QueryClient();
    const screen = await render(tree(client));
    await expect.element(screen.getByLabelText('Crypto state')).toHaveTextContent('ready:false');
    const result = unlock().catch((error: Error) => error.message);

    await expect.element(screen.getByRole('dialog')).toBeVisible();
    mocks.user = { ...productUser(), id: '33333333-3333-4333-8333-333333333333' };
    await screen.rerender(tree(client));

    await expect(result).resolves.toBe('Storage unlock cancelled');
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('rejects an old-account restore result instead of opening storage for the next account', async () => {
    let finish!: (value: boolean) => void;
    vi.mocked(CryptoProxy.tryUnlockWithRememberedDevice).mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const client = new QueryClient();
    const screen = await render(tree(client));
    const result = unlock().catch((error: Error) => error.message);
    mocks.user = productUser();
    await screen.rerender(tree(client));
    finish(true);

    await expect(result).resolves.toBe('Authentication identity changed');
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('terminates crypto and clears private queries when another tab starts logout', async () => {
    const client = new QueryClient();
    const screen = await render(tree(client));
    await expect.element(screen.getByLabelText('Crypto state')).toHaveTextContent('ready:false');
    client.setQueryData(['private'], 'decrypted data');
    mocks.eventHandler?.({ type: 'logout-start', userId: encryptedProductUser().id, sourceId: crypto.randomUUID() });

    expect(CryptoProxy.reset).toHaveBeenCalledOnce();
    expect(client.getQueryData(['private'])).toBeUndefined();
  });
});
