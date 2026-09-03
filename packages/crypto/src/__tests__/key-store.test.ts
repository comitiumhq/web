import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyStore } from '../worker/key-store';
import { mockWrappedKey } from './crypto-helpers';

describe('KeyStore', () => {
  let store: KeyStore;

  beforeEach(() => {
    store = new KeyStore();
  });

  describe('personal key', () => {
    it('stores and retrieves personal key (same reference)', () => {
      const key = new Uint8Array([1, 2, 3, 4, 5]);
      store.storePersonalKey(key);

      expect(store.getPersonalKey()).toBe(key);
    });
    it('throws when personal key not set', () => {
      expect(() => store.getPersonalKey()).toThrow('Crypto session not unlocked');
    });
    it('overwrites previous personal key', () => {
      const key1 = new Uint8Array([1, 2, 3]);
      const key2 = new Uint8Array([4, 5, 6]);

      store.storePersonalKey(key1);
      store.storePersonalKey(key2);

      expect(store.getPersonalKey()).toBe(key2);
    });
  });

  describe('isActive', () => {
    it('returns false initially', () => {
      expect(store.isActive()).toBe(false);
    });
  });

  describe('vault keys', () => {
    it('stores and retrieves vault key by orgId', () => {
      const key = new Uint8Array([10, 20, 30]);
      store.storeVaultKey('1', key);

      expect(store.getVaultKey('1')).toBe(key);
    });
  });

  describe('getOrUnwrapVaultKey', () => {
    const personalKey = new Uint8Array(32);
    const wrappedKey = mockWrappedKey();
    const vaultKey = new Uint8Array([99, 88, 77]);

    beforeEach(() => {
      store.storePersonalKey(personalKey);
    });

    it('caches result — does not call unwrapFn on second call', async () => {
      const unwrapFn = vi.fn().mockResolvedValue(vaultKey);

      await store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);
      const result2 = await store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);

      expect(result2).toBe(vaultKey);
      expect(unwrapFn).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent calls for same orgId', async () => {
      let resolveUnwrap!: (key: Uint8Array) => void;
      const unwrapFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUnwrap = resolve;
          }),
      );

      const p1 = store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);
      const p2 = store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);

      resolveUnwrap(vaultKey);

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe(vaultKey);
      expect(r2).toBe(vaultKey);
      expect(unwrapFn).toHaveBeenCalledTimes(1);
    });

    it('does not deduplicate different orgIds', async () => {
      const key1 = new Uint8Array([1]);
      const key2 = new Uint8Array([2]);
      const unwrapFn = vi.fn().mockResolvedValueOnce(key1).mockResolvedValueOnce(key2);

      const [r1, r2] = await Promise.all([
        store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn),
        store.getOrUnwrapVaultKey('2', wrappedKey, unwrapFn),
      ]);

      expect(r1).toBe(key1);
      expect(r2).toBe(key2);
      expect(unwrapFn).toHaveBeenCalledTimes(2);
    });

    it('throws when personal key not set', async () => {
      const emptyStore = new KeyStore();
      const unwrapFn = vi.fn();

      await expect(emptyStore.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn)).rejects.toThrow(
        'Crypto session not unlocked',
      );

      expect(unwrapFn).not.toHaveBeenCalled();
    });

    it('does not cache on error', async () => {
      const unwrapFn = vi.fn().mockRejectedValue(new Error('unwrap failed'));

      await expect(store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn)).rejects.toThrow();

      expect(store.getVaultKey('1')).toBeNull();
    });

    it('retries after previous failure', async () => {
      const unwrapFn = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(vaultKey);

      await expect(store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn)).rejects.toThrow('network error');

      const result = await store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);

      expect(result).toBe(vaultKey);
      expect(unwrapFn).toHaveBeenCalledTimes(2);
    });

    it('pre-cached vault key is returned without calling unwrapFn', async () => {
      store.storeVaultKey('1', vaultKey);
      const unwrapFn = vi.fn();

      const result = await store.getOrUnwrapVaultKey('1', wrappedKey, unwrapFn);

      expect(result).toBe(vaultKey);
      expect(unwrapFn).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('zeros personal key bytes in-place', () => {
      const key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      store.storePersonalKey(key);
      store.clear();

      expect(key.every((b) => b === 0)).toBe(true);
    });

    it('zeros all vault key bytes in-place', () => {
      const vk1 = new Uint8Array([10, 20, 30]);
      const vk2 = new Uint8Array([40, 50, 60]);

      store.storeVaultKey('1', vk1);
      store.storeVaultKey('2', vk2);
      store.clear();

      expect(vk1.every((b) => b === 0)).toBe(true);
      expect(vk2.every((b) => b === 0)).toBe(true);
    });

    it('after clear, new unwrap is triggered (no stale cache)', async () => {
      store.storePersonalKey(new Uint8Array(32));

      const key1 = new Uint8Array([1, 2, 3]);
      const key2 = new Uint8Array([4, 5, 6]);

      const unwrapFn = vi.fn().mockResolvedValueOnce(key1).mockResolvedValueOnce(key2);

      await store.getOrUnwrapVaultKey('1', {}, unwrapFn);
      expect(unwrapFn).toHaveBeenCalledTimes(1);

      store.clear();

      // Re-store personal key (required for unwrap)
      store.storePersonalKey(new Uint8Array(32));

      const result = await store.getOrUnwrapVaultKey('1', {}, unwrapFn);

      expect(result).toBe(key2);
      expect(unwrapFn).toHaveBeenCalledTimes(2);
    });

    it('clear during pending unwrap rejects and does not cache stale key', async () => {
      store.storePersonalKey(new Uint8Array(32));

      let resolveUnwrap!: (key: Uint8Array) => void;
      const unwrapFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUnwrap = resolve;
          }),
      );

      const promise = store.getOrUnwrapVaultKey('1', {}, unwrapFn);

      store.clear();

      const staleKey = new Uint8Array([1, 2, 3]);
      resolveUnwrap(staleKey);

      await expect(promise).rejects.toThrow('Crypto session cleared while unwrapping vault key');
      expect(staleKey.every((b) => b === 0)).toBe(true);
      expect(store.getVaultKey('1')).toBeNull();
      expect(store.isActive()).toBe(false);
    });
  });
});
