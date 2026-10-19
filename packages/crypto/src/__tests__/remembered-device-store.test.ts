import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicEncryptionKeySchema } from '../schemas';
import { TEST_KEYS } from './crypto-helpers';
import vector from './fixtures/key-protocol-v1.json';
import { DEVICE_ID, OTHER_USER_ID, UNLOCK_KEY, USER_ID } from './unlock-fixtures';

const storage = vi.hoisted(() => new Map<string, unknown>());

vi.mock('idb-keyval', () => ({
  createStore: () => 'device-test-store',
  get: async (key: string) => storage.get(key),
  update: async (key: string, updater: (value: unknown) => unknown) => {
    storage.set(key, updater(storage.get(key)));
  },
  del: async (key: string) => {
    storage.delete(key);
  },
  keys: async () => [...storage.keys()],
  clear: async () => {
    storage.clear();
  },
}));

import { RememberedDeviceStore } from '../worker/remembered-device-store';

const identity = { userId: USER_ID, keyVersion: 1, encryptedKeyFingerprint: 'a'.repeat(64) };
const params = { identity, userPublicKey: TEST_KEYS.alice.publicKey };
const serverKey = new Uint8Array(32).fill(19);
const slot = `${USER_ID}:1`;
let store: RememberedDeviceStore;

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('indexedDB', {});
  store = new RememberedDeviceStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('server-assisted remembered-device record', () => {
  it('preserves both v1 AAD transcripts independently of runtime property names', async () => {
    const encrypt = vi.spyOn(crypto.subtle, 'encrypt');

    try {
      await store.save(
        {
          identity: {
            userId: vector.userId,
            keyVersion: vector.encryptedUserKey.keyVersion,
            encryptedKeyFingerprint: vector.encryptedKeyFingerprint,
          },
          userPublicKey: publicEncryptionKeySchema.parse(vector.userPublicKey),
        },
        vector.deviceId,
        serverKey,
        UNLOCK_KEY,
      );

      const transcripts = encrypt.mock.calls.map(([algorithm]) =>
        new TextDecoder().decode((algorithm as AesGcmParams).additionalData),
      );

      expect(transcripts).toEqual([vector.deviceAad.server, vector.deviceAad.local]);
    } finally {
      encrypt.mockRestore();
    }
  });

  it('requires both local non-extractable CryptoKey and freshly supplied server key', async () => {
    await store.save(params, DEVICE_ID, serverKey, UNLOCK_KEY);

    const record = await loadRecord();

    expect(record.localDeviceKey.extractable).toBe(false);
    expect(record).not.toHaveProperty('expiresAt');
    expect(record).not.toHaveProperty('serverKey');
    expect(await store.decrypt(record, serverKey)).toEqual(UNLOCK_KEY);
    await expect(store.decrypt(record, new Uint8Array(32))).rejects.toThrow();
    await expect(crypto.subtle.exportKey('raw', record.localDeviceKey)).rejects.toThrow();

    const otherLocalKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);

    await expect(store.decrypt({ ...record, localDeviceKey: otherLocalKey }, serverKey)).rejects.toThrow();
  });

  it('authenticates device, identity, generation, public key and stable pk fingerprint', async () => {
    await store.save(params, DEVICE_ID, serverKey, UNLOCK_KEY);

    const record = await loadRecord();

    for (const changed of [
      { ...record, userId: OTHER_USER_ID },
      { ...record, keyVersion: 2 },
      { ...record, deviceId: '0199a000-0000-7000-8000-000000000005' },
      { ...record, encryptedKeyFingerprint: 'b'.repeat(64) },
      { ...record, userPublicKey: TEST_KEYS.bob.publicKey },
    ]) {
      await expect(store.decrypt(changed, serverKey)).rejects.toThrow();
    }
  });

  it('removes a mismatched record instead of attempting its unlock', async () => {
    await store.save(params, DEVICE_ID, serverKey, UNLOCK_KEY);

    expect(
      await store.load({ ...params, identity: { ...identity, encryptedKeyFingerprint: 'b'.repeat(64) } }),
    ).toBeNull();
    expect(storage.has(slot)).toBe(false);
  });

  it('has no local TTL and stores only the current generation slot', async () => {
    await store.save(params, DEVICE_ID, serverKey, UNLOCK_KEY);

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 365 * 86400000);

    expect(await store.load(params)).not.toBeNull();

    await store.save({ ...params, identity: { ...identity, keyVersion: 2 } }, DEVICE_ID, serverKey, UNLOCK_KEY);

    expect(storage.has(slot)).toBe(false);
    expect(storage.has(`${USER_ID}:2`)).toBe(true);

    vi.restoreAllMocks();
  });

  it('forgets all local crypto records on explicit logout', async () => {
    await store.save(params, DEVICE_ID, serverKey, UNLOCK_KEY);

    await store.forgetAll();

    expect(storage.size).toBe(0);
  });
});

async function loadRecord() {
  const record = await store.load(params);

  if (!record) {
    throw new Error('Expected a saved device record');
  }

  return record;
}
