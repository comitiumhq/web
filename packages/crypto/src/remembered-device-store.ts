import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import { clear, createStore, del, get, keys, update } from 'idb-keyval';

import { aesGcmParams, decryptBinaryData, encryptBinaryData } from './data-encryption';
import { keyContextBytes } from './key-context';
import {
  type DeviceBinding,
  type RememberedDeviceContext,
  type RememberedDeviceRecord,
  rememberedDeviceCiphertextSchema,
  rememberedDeviceRecordSchema,
} from './schemas/remembered-device';
import { type CryptoSessionIdentity, formatCryptoSessionIdentity, isSameCryptoSession } from './session';
import { isSamePublicEncryptionKey } from './xwing';

const rememberedDeviceStore = createStore('comitium_crypto', 'comitium_crypto_device_unlocks');

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
    const value = await get<unknown>(key, rememberedDeviceStore);

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

    await del(key, rememberedDeviceStore);

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

      const allKeys = await keys(rememberedDeviceStore);

      for (const key of allKeys) {
        if (typeof key === 'string' && key.startsWith(`${params.identity.userId}:`)) {
          assertCurrent();

          await del(key, rememberedDeviceStore);
        }
      }

      await update(
        formatCryptoSessionIdentity(params.identity),
        () => {
          /**
           * This runs synchronously inside the IDB write transaction, after any pending logout/clear.
           */
          assertCurrent();

          return record;
        },
        rememberedDeviceStore,
      );
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
      await del(formatCryptoSessionIdentity(identity), rememberedDeviceStore);
    }
  }

  async forgetAll(): Promise<void> {
    this.generation += 1;

    if (globalThis.indexedDB) {
      await clear(rememberedDeviceStore);
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
