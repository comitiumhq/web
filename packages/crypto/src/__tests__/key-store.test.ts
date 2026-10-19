import { describe, expect, it, vi } from 'vitest';
import { KeyStore } from '../worker/key-store';
import { TEST_KEYS } from './crypto-helpers';
import { UNLOCK_KEY, vaultFixture } from './unlock-fixtures';

function unlockedStore() {
  const store = new KeyStore();
  const userKey = { userPrivateKey: TEST_KEYS.alice.privateKey.slice(), unlockKey: UNLOCK_KEY.slice() };

  store.storeUserKey(userKey, store.captureGeneration());

  return { store, userKey };
}

describe('Worker key ownership and caches', () => {
  it('zeros user/U, vault and search secrets when clearing the session', async () => {
    const { store, userKey } = unlockedStore();
    const access = await vaultFixture();
    const vaultKey = new Uint8Array(32).fill(13);
    const searchKey = new Uint8Array(32).fill(14);

    await store.getOrUnwrapVaultKey(access, async () => vaultKey);
    await store.getOrUnwrapSearchKey(access, async () => searchKey);

    store.clear();

    for (const key of [userKey.userPrivateKey, userKey.unlockKey, vaultKey, searchKey]) {
      expect(key.every((value) => value === 0)).toBe(true);
    }

    expect(store.isActive()).toBe(false);
    expect(() => store.getUnlockKey()).toThrow('not unlocked');
  });

  it('shares pending work only for the exact version/public-key/grant binding', async () => {
    const { store } = unlockedStore();
    const access = await vaultFixture();
    const load = vi.fn(async () => new Uint8Array(32).fill(5));

    const [first, second] = await Promise.all([
      store.getOrUnwrapVaultKey(access, load),
      store.getOrUnwrapVaultKey(access, load),
    ]);

    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);

    await store.getOrUnwrapVaultKey({ ...access, vaultPublicKey: TEST_KEYS.charlie.publicKey }, load);
    await store.getOrUnwrapVaultKey({ ...access, recipientKeyVersion: 2 }, load);

    expect(load).toHaveBeenCalledTimes(3);
  });

  it('does not reuse a search cache entry for a different wrapper or vault generation', async () => {
    const { store } = unlockedStore();
    const access = await vaultFixture();
    const load = vi.fn(async () => new Uint8Array(32).fill(5));

    await store.getOrUnwrapSearchKey(access, load);
    await store.getOrUnwrapSearchKey({ ...access, searchKey: { ...access.searchKey, vaultKeyVersion: 2 } }, load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it.each(['vault', 'search'] as const)(
    'zeros delayed %s completion after clear instead of publishing it',
    async (kind) => {
      const { store } = unlockedStore();
      const access = await vaultFixture();
      const key = new Uint8Array(32).fill(5);
      let complete!: (key: Uint8Array) => void;
      const load = () =>
        new Promise<Uint8Array>((resolve) => {
          complete = resolve;
        });
      const pending =
        kind === 'vault' ? store.getOrUnwrapVaultKey(access, load) : store.getOrUnwrapSearchKey(access, load);

      store.clear();
      complete(key);

      await expect(pending).rejects.toThrow('cleared');
      expect(key.every((value) => value === 0)).toBe(true);
    },
  );

  it('rejects and wipes a delayed user unlock after a lifecycle change', () => {
    const store = new KeyStore();
    const generation = store.captureGeneration();
    const userKey = { userPrivateKey: new Uint8Array(32).fill(1), unlockKey: new Uint8Array(32).fill(2) };

    store.clear();

    expect(() => store.storeUserKey(userKey, generation)).toThrow('cleared');
    expect(userKey.userPrivateKey.every((value) => value === 0)).toBe(true);
    expect(userKey.unlockKey.every((value) => value === 0)).toBe(true);
  });
});
