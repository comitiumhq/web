import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import { isDefined } from './runtime-guards';

const textEncoder = new TextEncoder();
const HASH_KEY_LENGTH_BYTES = 32;
const UUID_LENGTH_BYTES = 16;
const UUID_SCOPE_SALT_LENGTH_BYTES = UUID_LENGTH_BYTES * 2;

export function createUuidScopeSalt(primaryId: string, secondaryId?: string): Uint8Array {
  const salt = new Uint8Array(UUID_SCOPE_SALT_LENGTH_BYTES);
  salt.set(uuidToBytes(primaryId));

  if (isDefined(secondaryId)) {
    salt.set(uuidToBytes(secondaryId), UUID_LENGTH_BYTES);
  }

  return salt;
}

export function createBlindIndexDigest(
  rootKey: Uint8Array,
  salt: Uint8Array,
  namespace: string,
  normalizedValue: string,
): string {
  const hashKey = hkdf(sha256, rootKey, salt, textEncoder.encode(namespace), HASH_KEY_LENGTH_BYTES);

  try {
    return bytesToHex(hmac(sha256, hashKey, textEncoder.encode(normalizedValue)));
  } finally {
    hashKey.fill(0);
  }
}

function uuidToBytes(uuid: string): Uint8Array {
  return hexToBytes(uuid.replaceAll('-', ''));
}
