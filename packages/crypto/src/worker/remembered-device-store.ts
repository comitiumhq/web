import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import { createStore, del, get, set } from 'idb-keyval';
import type { Address } from 'viem';
import { z } from 'zod';

import { isCanonicalAddress, isCanonicalIsoDateString, isCryptoKey, isDefined } from '../runtime-guards';
import { aesGcmIvSchema, base64StringSchema, type PublicEncryptionKey, publicEncryptionKeySchema } from '../schemas';
import type { CryptoSessionIdentity } from '../session';
import { formatCryptoSessionIdentity } from '../session';
import { isSamePublicEncryptionKey, serializePublicEncryptionKey } from '../xwing';

const DB_NAME = 'comitium_crypto';
const STORE_NAME = 'comitium_crypto_device_unlocks';
const REMEMBERED_DEVICE_RECORD_VERSION = 1;
const REMEMBERED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REMEMBERED_DEVICE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const REMEMBERED_DEVICE_PURPOSE = 'comitium.remembered-device-unlock';
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const DEVICE_ID_HEX_REGEX = /^[a-f0-9]{32}$/;
const nonEmptyStringSchema = z.string().min(1);
const sha256HexSchema = z.string().regex(SHA256_HEX_REGEX);
const deviceIdHexSchema = z.string().regex(DEVICE_ID_HEX_REGEX);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value instanceof Object && !Array.isArray(value);
}

const rememberedDeviceStore = createStore(DB_NAME, STORE_NAME);

export interface RememberedDeviceUnlockRecord {
  v: 1;
  walletAddress: Address;
  personalPublicKey: PublicEncryptionKey;
  wrappedPersonalKeyFingerprint: string;
  deviceId: string;
  deviceUnlockKey: CryptoKey;
  iv: string;
  ct: string;
  createdAt: string;
  expiresAt: string;
}

export interface RememberedDeviceStoreParams {
  identity: CryptoSessionIdentity;
  personalPublicKey: PublicEncryptionKey;
}

type RememberedDeviceAadRecord = Omit<RememberedDeviceUnlockRecord, 'deviceUnlockKey' | 'iv' | 'ct'>;

export class RememberedDeviceStore {
  async load(params: RememberedDeviceStoreParams): Promise<RememberedDeviceUnlockRecord | null> {
    if (!canUseRememberedDeviceStorage()) {
      return null;
    }

    const key = formatCryptoSessionIdentity(params.identity);
    const record = await get<unknown>(key, rememberedDeviceStore);

    if (!isDefined(record)) {
      return null;
    }

    if (!isUsableRecord(record, params)) {
      await del(key, rememberedDeviceStore);

      return null;
    }

    return record;
  }

  async save(params: RememberedDeviceStoreParams, personalKeyWrappingKey: Uint8Array): Promise<void> {
    if (!canUseRememberedDeviceStorage()) {
      return;
    }

    const record = await createRememberedDeviceRecord(params, personalKeyWrappingKey);

    await set(formatCryptoSessionIdentity(params.identity), record, rememberedDeviceStore);
  }

  async delete(identity: CryptoSessionIdentity): Promise<void> {
    if (!canUseRememberedDeviceStorage()) {
      return;
    }

    await del(formatCryptoSessionIdentity(identity), rememberedDeviceStore);
  }

  /**
   * Decrypt a remembered-device record to its PersonalKeyWrappingKey. Bound by the
   * non-extractable `deviceUnlockKey`; AAD rejects changes to authenticated record metadata.
   */
  async decrypt(record: RememberedDeviceUnlockRecord): Promise<Uint8Array> {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64.decode(record.iv) as BufferSource,
        additionalData: rememberedDeviceAad(record),
      },
      record.deviceUnlockKey,
      base64.decode(record.ct) as BufferSource,
    );

    return new Uint8Array(plaintext);
  }
}

async function createRememberedDeviceRecord(
  params: RememberedDeviceStoreParams,
  personalKeyWrappingKey: Uint8Array,
): Promise<RememberedDeviceUnlockRecord> {
  const deviceUnlockKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REMEMBERED_DEVICE_TTL_MS);
  const recordBase = {
    v: REMEMBERED_DEVICE_RECORD_VERSION,
    walletAddress: params.identity.address,
    personalPublicKey: params.personalPublicKey,
    wrappedPersonalKeyFingerprint: params.identity.wrappedPersonalKeyFingerprint,
    deviceId: bytesToHex(randomBytes(16)),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  } satisfies RememberedDeviceAadRecord;
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: rememberedDeviceAad(recordBase) },
    deviceUnlockKey,
    personalKeyWrappingKey as BufferSource,
  );

  return {
    ...recordBase,
    deviceUnlockKey,
    iv: base64.encode(iv),
    ct: base64.encode(new Uint8Array(encrypted)),
  };
}

function isUsableRecord(record: unknown, params: RememberedDeviceStoreParams): record is RememberedDeviceUnlockRecord {
  if (!isRememberedDeviceRecord(record)) {
    return false;
  }

  return (
    record.walletAddress === params.identity.address &&
    isSamePublicEncryptionKey(record.personalPublicKey, params.personalPublicKey) &&
    record.wrappedPersonalKeyFingerprint === params.identity.wrappedPersonalKeyFingerprint &&
    hasValidLifetime(record)
  );
}

function hasValidLifetime(record: RememberedDeviceUnlockRecord): boolean {
  if (!isCanonicalIsoDateString(record.createdAt) || !isCanonicalIsoDateString(record.expiresAt)) {
    return false;
  }

  const createdAt = Date.parse(record.createdAt);
  const expiresAt = Date.parse(record.expiresAt);
  const now = Date.now();

  return (
    createdAt <= now + REMEMBERED_DEVICE_CLOCK_TOLERANCE_MS &&
    expiresAt - createdAt === REMEMBERED_DEVICE_TTL_MS &&
    expiresAt > now
  );
}

function isRememberedDeviceRecord(record: unknown): record is RememberedDeviceUnlockRecord {
  if (!isRecord(record)) {
    return false;
  }

  return (
    record.v === REMEMBERED_DEVICE_RECORD_VERSION &&
    isCanonicalAddress(record.walletAddress) &&
    publicEncryptionKeySchema.safeParse(record.personalPublicKey).success &&
    sha256HexSchema.safeParse(record.wrappedPersonalKeyFingerprint).success &&
    deviceIdHexSchema.safeParse(record.deviceId).success &&
    isRememberedDeviceCryptoKey(record.deviceUnlockKey) &&
    aesGcmIvSchema.safeParse(record.iv).success &&
    base64StringSchema.safeParse(record.ct).success &&
    nonEmptyStringSchema.safeParse(record.createdAt).success &&
    nonEmptyStringSchema.safeParse(record.expiresAt).success
  );
}

function isRememberedDeviceCryptoKey(value: unknown): value is CryptoKey {
  if (!isCryptoKey(value)) {
    return false;
  }

  return (
    value.type === 'secret' &&
    value.extractable === false &&
    value.algorithm.name === 'AES-GCM' &&
    value.usages.includes('encrypt') &&
    value.usages.includes('decrypt')
  );
}

/**
 * AES-GCM AAD binding a remembered-device record to its identity (wallet, public key,
 * fingerprint, deviceId). Wire-frozen field set — changing authenticated metadata fails decryption.
 */
function rememberedDeviceAad(record: RememberedDeviceAadRecord): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      purpose: REMEMBERED_DEVICE_PURPOSE,
      v: record.v,
      walletAddress: record.walletAddress,
      personalPublicKey: serializePublicEncryptionKey(record.personalPublicKey),
      wrappedPersonalKeyFingerprint: record.wrappedPersonalKeyFingerprint,
      deviceId: record.deviceId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    }),
  );
}

function canUseRememberedDeviceStorage(): boolean {
  return isDefined(globalThis.indexedDB);
}
