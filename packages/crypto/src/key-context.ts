import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Canonical UTF-8 JSON for key metadata; existing content-envelope transcripts stay unchanged.
 */
export function keyContextBytes(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(sortKeys(value)));
}

export function keyMetadataFingerprint(value: JsonValue): string {
  return bytesToHex(sha256(keyContextBytes(value)));
}

function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }

  return value;
}
