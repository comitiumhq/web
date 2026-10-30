import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import { aesGcmParams, decryptBinaryData, encryptBinaryData } from './data-encryption';
import { keyContextBytes } from './key-context';
import { isString } from './runtime-guards';
import {
  type DeviceBinding,
  type RememberedDeviceContext,
  type RememberedDeviceRecord,
  rememberedDeviceCiphertextSchema,
  rememberedDeviceRecordSchema,
} from './schemas/remembered-device';
import { type CryptoSessionIdentity, formatCryptoSessionIdentity, isSameCryptoSession } from './session';
import { isSamePublicEncryptionKey } from './xwing';

interface RememberedDeviceDatabase extends DBSchema {
  comitium_crypto_device_unlocks: { key: string; value: RememberedDeviceRecord };
}

const STORE = 'comitium_crypto_device_unlocks';
let database: Promise<IDBPDatabase<RememberedDeviceDatabase>> | undefined;

function openRememberedDeviceDatabase() {
  database ??= openDB<RememberedDeviceDatabase>('comitium_crypto', 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });

  return database;
}

export class RememberedDeviceStore {
  private generation = 0;

  isSupported(): boolean {
    return Boolean(globalThis.indexedDB);
  }

  async load(params: RememberedDeviceContext): Promise<RememberedDeviceRecord | null> {
    if (!this.isSupported()) {
      return null;
    }

    const key = formatCryptoSessionIdentity(params.identity);
    const db = await openRememberedDeviceDatabase();
    const value = await db.get(STORE, key);

    if (value === undefined) {
      return null;
    }

    const result = rememberedDeviceRecordSchema.safeParse(value);

    if (result.success) {
      const matchesIdentity = isSameCryptoSession(result.data, params.identity);
      const matchesPublicKey = isSamePublicEncryptionKey(result.data.userPublicKey, params.userPublicKey);

      if (matchesIdentity && matchesPublicKey) {
        return result.data;
      }
    }

    await db.delete(STORE, key);

    return null;
  }

  async save(
    params: RememberedDeviceContext,
    deviceId: string,
    serverDeviceKey: Uint8Array,
    unlockKey: Uint8Array,
    assertSessionCurrent: () => void = () => {},
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Remembered-device storage is unavailable');
    }

    const generation = this.generation;

    const assertCurrent = () => {
      assertSessionCurrent();

      if (generation !== this.generation) {
        throw new Error('Remembered-device storage was cleared during the operation');
      }
    };

    const localDeviceKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);

    const binding: DeviceBinding = { v: 1, ...params.identity, userPublicKey: params.userPublicKey, deviceId };
    const inner = await encryptBinaryData(unlockKey, serverDeviceKey, deviceAad(binding, 'server'));
    const plaintext = new TextEncoder().encode(JSON.stringify({ ct: base64.encode(inner.ct), iv: inner.iv }));
    const iv = randomBytes(12);

    try {
      const encrypted = await crypto.subtle.encrypt(
        aesGcmParams(iv, deviceAad(binding, 'local')),
        localDeviceKey,
        plaintext,
      );

      const record = rememberedDeviceRecordSchema.parse({
        ...binding,
        localDeviceKey,
        iv: base64.encode(iv),
        ct: base64.encode(new Uint8Array(encrypted)),
      });

      const db = await openRememberedDeviceDatabase();
      const transaction = db.transaction(STORE, 'readwrite');
      void transaction.done.catch(() => {});

      try {
        const allKeys = await transaction.store.getAllKeys();

        for (const key of allKeys) {
          if (isString(key) && key.startsWith(`${params.identity.userId}:`)) {
            assertCurrent();

            await transaction.store.delete(key);
          }
        }

        /**
         * Check after the queued read, inside the write transaction: logout cannot resurrect this slot.
         */
        assertCurrent();

        await transaction.store.put(record, formatCryptoSessionIdentity(params.identity));
        await transaction.done;
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          /* Already completed or aborted. */
        }

        await transaction.done.catch(() => {});
        throw error;
      }
    } finally {
      inner.ct.fill(0);
      plaintext.fill(0);
    }
  }

  async decrypt(record: RememberedDeviceRecord, serverDeviceKey: Uint8Array): Promise<Uint8Array> {
    const outer = await crypto.subtle.decrypt(
      aesGcmParams(base64.decode(record.iv), deviceAad(record, 'local')),
      record.localDeviceKey,
      base64.decode(record.ct) as BufferSource,
    );

    const plaintext = new Uint8Array(outer);

    try {
      const inner = rememberedDeviceCiphertextSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));

      return await decryptBinaryData(base64.decode(inner.ct), inner.iv, serverDeviceKey, deviceAad(record, 'server'));
    } finally {
      plaintext.fill(0);
    }
  }

  async delete(identity: CryptoSessionIdentity): Promise<void> {
    if (globalThis.indexedDB) {
      const db = await openRememberedDeviceDatabase();

      await db.delete(STORE, formatCryptoSessionIdentity(identity));
    }
  }

  async forgetAll(): Promise<void> {
    this.generation += 1;

    if (globalThis.indexedDB) {
      const db = await openRememberedDeviceDatabase();

      await db.clear(STORE);
    }
  }
}

function deviceAad(binding: DeviceBinding, layer: 'server' | 'local'): Uint8Array {
  /**
   * v1 transcript field names remain fixed when runtime properties are renamed.
   */
  return keyContextBytes({
    purpose: `comitium.remembered-device-unlock.${layer}`,
    v: binding.v,
    userId: binding.userId,
    keyVersion: binding.keyVersion,
    personalKeyFingerprint: binding.encryptedKeyFingerprint,
    personalPublicKey: binding.userPublicKey,
    deviceId: binding.deviceId,
  });
}
