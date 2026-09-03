import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cryptoProxyMock = vi.hoisted(() => ({ reset: vi.fn() }));

vi.mock('@comitium/crypto', () => ({ CryptoProxy: cryptoProxyMock }));

import { type CryptoResetMessage, performCryptoReset, subscribeToCryptoReset } from '../crypto-reset';

function stubIndexedDb(succeed: boolean): void {
  const deleteDatabase = vi.fn(() => {
    const request = {} as IDBOpenDBRequest;

    queueMicrotask(() => {
      if (succeed) {
        request.onsuccess?.(new Event('success'));
      } else {
        request.onerror?.(new Event('error'));
      }
    });

    return request;
  });

  vi.stubGlobal('indexedDB', { deleteDatabase });
}

describe('performCryptoReset', () => {
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replace = vi.fn();
    vi.stubGlobal('window', { location: { replace } });
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        postMessage(): void {}
        close(): void {}
      },
    );
    vi.stubGlobal('crypto', { randomUUID: () => 'reset-1' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps crypto terminal and allows cleanup retry when backend logout fails', async () => {
    stubIndexedDb(true);
    const logout = vi.fn().mockRejectedValue(new Error('backend down'));
    const clearClientState = vi.fn();

    await expect(performCryptoReset({ returnTo: '/jobs', logout, clearClientState })).rejects.toThrow('backend down');
    await expect(performCryptoReset({ returnTo: '/jobs', logout, clearClientState })).rejects.toThrow('backend down');

    expect(cryptoProxyMock.reset).toHaveBeenCalledTimes(2);
    expect(logout).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not reload when database deletion fails', async () => {
    stubIndexedDb(false);
    const logout = vi.fn().mockResolvedValue(undefined);
    const clearClientState = vi.fn();

    await expect(performCryptoReset({ returnTo: '/jobs', logout, clearClientState })).rejects.toThrow();

    expect(cryptoProxyMock.reset).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('reports blocked deletion while keeping the original request pending', async () => {
    const controls: { rejectDelete: (() => void) | null } = { rejectDelete: null };
    const deleteDatabase = vi.fn(() => {
      const request = {} as IDBOpenDBRequest;
      controls.rejectDelete = () => request.onerror?.(new Event('error'));
      queueMicrotask(() => request.onblocked?.(new Event('blocked') as IDBVersionChangeEvent));

      return request;
    });
    vi.stubGlobal('indexedDB', { deleteDatabase });
    const onDatabaseBlocked = vi.fn();
    const logout = vi.fn().mockResolvedValue(undefined);
    const clearClientState = vi.fn();

    const reset = performCryptoReset({ returnTo: '/jobs', logout, clearClientState, onDatabaseBlocked });
    await vi.waitFor(() => expect(onDatabaseBlocked).toHaveBeenCalledTimes(1));

    expect(deleteDatabase).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();

    controls.rejectDelete?.();
    await expect(reset).rejects.toThrow('Failed to delete crypto database');
  });

  it('deduplicates concurrent cleanup attempts', async () => {
    const controls: { rejectDelete: (() => void) | null } = { rejectDelete: null };
    const deleteDatabase = vi.fn(() => {
      const request = {} as IDBOpenDBRequest;
      controls.rejectDelete = () => request.onerror?.(new Event('error'));

      return request;
    });
    vi.stubGlobal('indexedDB', { deleteDatabase });
    const logout = vi.fn().mockResolvedValue(undefined);
    const clearClientState = vi.fn();

    const first = performCryptoReset({ returnTo: '/jobs', logout, clearClientState });
    const second = performCryptoReset({ returnTo: '/other', logout, clearClientState });

    expect(first).toBe(second);
    expect(deleteDatabase).toHaveBeenCalledTimes(1);
    controls.rejectDelete?.();
    await expect(first).rejects.toThrow('Failed to delete crypto database');
  });

  it('keeps the initiating tab on its requested page after logout', async () => {
    const channels: Array<{
      onmessage: ((event: MessageEvent<CryptoResetMessage>) => void) | null;
    }> = [];

    vi.stubGlobal(
      'BroadcastChannel',
      class {
        onmessage: ((event: MessageEvent<CryptoResetMessage>) => void) | null = null;

        constructor() {
          channels.push(this);
        }

        postMessage(message: CryptoResetMessage): void {
          for (const channel of channels) {
            if (channel !== this) {
              channel.onmessage?.({ data: message } as MessageEvent<CryptoResetMessage>);
            }
          }
        }

        close(): void {}
      },
    );

    stubIndexedDb(true);
    const logout = vi.fn().mockResolvedValue(undefined);
    const disconnectWallet = vi.fn().mockResolvedValue(undefined);
    const clearClientState = vi.fn();
    const onResetStart = vi.fn();
    const onResetComplete = vi.fn();
    const unsubscribe = subscribeToCryptoReset({ onResetStart, onResetComplete });

    await performCryptoReset({
      returnTo: '/invite?token=invite-token',
      logout,
      disconnectWallet,
      clearClientState,
    });

    expect(cryptoProxyMock.reset).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(disconnectWallet).toHaveBeenCalledTimes(1);
    expect(clearClientState).toHaveBeenCalledTimes(1);
    expect(onResetStart).not.toHaveBeenCalled();
    expect(onResetComplete).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/invite?token=invite-token');

    unsubscribe();
  });
});

describe('subscribeToCryptoReset', () => {
  let channel: {
    onmessage: ((event: MessageEvent<CryptoResetMessage>) => void) | null;
    close: ReturnType<typeof vi.fn>;
  };
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replace = vi.fn();
    vi.stubGlobal('window', { location: { replace } });
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        onmessage: ((event: MessageEvent<CryptoResetMessage>) => void) | null = null;
        close = vi.fn();

        constructor() {
          channel = this;
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('waits for local teardown before reloading on reset-complete', async () => {
    const controls: { finishLocalReset: (() => void) | null } = { finishLocalReset: null };
    const onResetStart = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          controls.finishLocalReset = resolve;
        }),
    );
    const unsubscribe = subscribeToCryptoReset({ onResetStart, onResetComplete: vi.fn() });

    channel.onmessage?.({
      data: { type: 'reset-start', sourceId: 'other-tab' },
    } as MessageEvent<CryptoResetMessage>);
    channel.onmessage?.({
      data: { type: 'reset-complete', sourceId: 'other-tab' },
    } as MessageEvent<CryptoResetMessage>);
    await Promise.resolve();

    expect(cryptoProxyMock.reset).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();

    controls.finishLocalReset?.();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/jobs'));

    unsubscribe();
    expect(channel.close).toHaveBeenCalledTimes(1);
  });
});
