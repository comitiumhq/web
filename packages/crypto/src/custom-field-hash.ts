import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const textEncoder = new TextEncoder();
const HASH_INFO_PREFIX = 'comitium-custom-field-hash-v1';
const SEARCHABLE_FIELD_TYPES = ['yes_no', 'multiple_choice', 'location'] as const;

export type SearchableCustomFieldType = (typeof SEARCHABLE_FIELD_TYPES)[number];

const searchableFieldTypes = new Set<string>(SEARCHABLE_FIELD_TYPES);

function uuidToBytes(uuid: string): Uint8Array {
  return hexToBytes(uuid.replace(/-/g, ''));
}

function customFieldHashSalt(orgId: string, fieldId: string): Uint8Array {
  const salt = new Uint8Array(32);
  salt.set(uuidToBytes(orgId), 0);
  salt.set(uuidToBytes(fieldId), 16);

  return salt;
}

/**
 * Per-field HMAC key for custom-field blind indexes
 * (HKDF, salt = org UUID || field UUID, info = namespace || field type).
 * `HASH_INFO_PREFIX` wire-frozen — changing it orphans stored `value_hash`.
 */
export function deriveCustomFieldHashKey(
  vaultPrivateKey: Uint8Array,
  orgId: string,
  fieldId: string,
  fieldType: SearchableCustomFieldType,
): Uint8Array {
  const salt = customFieldHashSalt(orgId, fieldId);
  const info = textEncoder.encode(`${HASH_INFO_PREFIX}:${fieldType}`);

  return hkdf(sha256, vaultPrivateKey, salt, info, 32);
}

export function isSearchableFieldType(fieldType: string): fieldType is SearchableCustomFieldType {
  return searchableFieldTypes.has(fieldType);
}

export function normalizeCustomFieldValue(value: unknown, fieldType: string): string {
  switch (fieldType) {
    case 'multiple_choice':
    case 'yes_no':
      return String(value).trim().toLowerCase();
    case 'location': {
      const id = (value as { cityId?: number } | null)?.cityId;

      return typeof id === 'number' ? String(id) : '';
    }
    default:
      throw new Error(`Field type "${fieldType}" does not support blind-index hashing`);
  }
}

/**
 * HMAC-SHA256 blind index for a pre-normalized value → 64-hex.
 */
export function hmacCustomFieldValue(hashKey: Uint8Array, normalizedValue: string): string {
  return bytesToHex(hmac(sha256, hashKey, textEncoder.encode(normalizedValue)));
}
