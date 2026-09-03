import type { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPublicEncryptionKey } from './crypto-helpers';

const idbKeyvalMock = vi.hoisted(() => ({
  createStore: vi.fn(() => 'remembered-device-store'),
  del: vi.fn(),
  delMany: vi.fn(),
  entries: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('idb-keyval', () => idbKeyvalMock);

import { RememberedDeviceStore, type RememberedDeviceUnlockRecord } from '../worker/remembered-device-store';

const TEST_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address;
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const TEST_FINGERPRINT = 'f'.repeat(64);
const TEST_PUBLIC_KEY = mockPublicEncryptionKey();
const OTHER_PUBLIC_KEY = mockPublicEncryptionKey('33'.repeat(32));
const TEST_IDENTITY = {
  address: TEST_ADDRESS,
  wrappedPersonalKeyFingerprint: TEST_FINGERPRINT,
};
const TEST_PARAMS = {
  identity: TEST_IDENTITY,
  personalPublicKey: TEST_PUBLIC_KEY,
};
const TEST_KEY = `${TEST_ADDRESS}:${TEST_FINGERPRINT}`;
const PERSONAL_KEY_WRAPPING_KEY = new Uint8Array(32).fill(7);

describe('RememberedDeviceStore', () => {
  let store: RememberedDeviceStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('indexedDB', {});
    store = new RememberedDeviceStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves a device-local wrapper and can decrypt it back', async () => {
    idbKeyvalMock.set.mockResolvedValue(undefined);

    await store.save(TEST_PARAMS, PERSONAL_KEY_WRAPPING_KEY);

    const [key, record] = idbKeyvalMock.set.mock.calls[0];

    expect(key).toBe(TEST_KEY);
    expect(record).toMatchObject({
      v: 1,
      walletAddress: TEST_ADDRESS,
      personalPublicKey: TEST_PUBLIC_KEY,
      wrappedPersonalKeyFingerprint: TEST_FINGERPRINT,
    });
    expect(record.deviceUnlockKey).toBeInstanceOf(CryptoKey);
    expect(record.deviceUnlockKey.extractable).toBe(false);
    expect(record.deviceUnlockKey.usages).toEqual(['encrypt', 'decrypt']);
    expect(Date.parse(record.expiresAt)).toBeGreaterThan(Date.now());

    const decrypted = await store.decrypt(record);

    expect(decrypted).toEqual(PERSONAL_KEY_WRAPPING_KEY);
  });

  it('loads a usable record without cleanup', async () => {
    const record = await createRecord();
    idbKeyvalMock.get.mockResolvedValue(record);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBe(record);
    expect(idbKeyvalMock.get).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
    expect(idbKeyvalMock.del).not.toHaveBeenCalled();
  });

  it('deletes malformed records before returning null', async () => {
    idbKeyvalMock.get.mockResolvedValue({ walletAddress: TEST_ADDRESS });
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes expired records before returning null', async () => {
    const record = await createRecord({ expiresAt: new Date(Date.now() - 1_000).toISOString() });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with mismatched wallet binding before returning null', async () => {
    const record = await createRecord({ walletAddress: OTHER_ADDRESS });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with mismatched personal public key before returning null', async () => {
    const record = await createRecord({ personalPublicKey: OTHER_PUBLIC_KEY });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with mismatched wrapped-key fingerprint before returning null', async () => {
    const record = await createRecord({ wrappedPersonalKeyFingerprint: 'c'.repeat(64) });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with malformed public keys before returning null', async () => {
    const record = await createRecord({ personalPublicKey: 'not-a-public-key' as never });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with malformed AES-GCM IVs before returning null', async () => {
    const record = await createRecord({ iv: 'AQIDBA==' });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes records with extractable device keys before returning null', async () => {
    const extractableKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const record = await createRecord({ deviceUnlockKey: extractableKey });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('deletes non-canonical address records before returning null', async () => {
    const record = await createRecord({ walletAddress: TEST_ADDRESS.toUpperCase() as Address });
    idbKeyvalMock.get.mockResolvedValue(record);
    idbKeyvalMock.del.mockResolvedValue(undefined);

    const loaded = await store.load(TEST_PARAMS);

    expect(loaded).toBeNull();
    expect(idbKeyvalMock.del).toHaveBeenCalledWith(TEST_KEY, 'remembered-device-store');
  });

  it('fails decrypt when record AAD-bound fields are tampered', async () => {
    const record = await createRecord();
    const tamperedRecord = {
      ...record,
      deviceId: 'tampered-device-id',
    };

    await expect(store.decrypt(tamperedRecord)).rejects.toThrow();
  });

  it('does not touch IndexedDB when storage is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(store.load(TEST_PARAMS)).resolves.toBeNull();
    await expect(store.save(TEST_PARAMS, PERSONAL_KEY_WRAPPING_KEY)).resolves.toBeUndefined();
    await expect(store.delete(TEST_IDENTITY)).resolves.toBeUndefined();

    expect(idbKeyvalMock.get).not.toHaveBeenCalled();
    expect(idbKeyvalMock.set).not.toHaveBeenCalled();
    expect(idbKeyvalMock.del).not.toHaveBeenCalled();
  });
});

async function createRecord(
  overrides: Partial<RememberedDeviceUnlockRecord> = {},
): Promise<RememberedDeviceUnlockRecord> {
  idbKeyvalMock.set.mockClear();
  idbKeyvalMock.set.mockResolvedValue(undefined);

  const store = new RememberedDeviceStore();

  await store.save(TEST_PARAMS, PERSONAL_KEY_WRAPPING_KEY);

  const record = idbKeyvalMock.set.mock.calls[0][1] as RememberedDeviceUnlockRecord;

  return { ...record, ...overrides };
}
