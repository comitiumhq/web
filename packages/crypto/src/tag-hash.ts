import { createBlindIndexDigest } from './blind-index';

const TAG_HASH_NAMESPACE = 'comitium-tag-hash-v1';
const EMPTY_SALT = new Uint8Array(0);

/**
 * `TAG_HASH_NAMESPACE` is wire-frozen — changing it orphans every stored hash.
 */
export function hashTagLabel(vaultPrivateKey: Uint8Array, label: string): string {
  return createBlindIndexDigest(vaultPrivateKey, EMPTY_SALT, TAG_HASH_NAMESPACE, normalizeTagLabel(label));
}

/**
 * Canonical HMAC input for tag labels.
 * Wire contract — write and lookup paths must both run it so identical labels hash equal.
 */
export function normalizeTagLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLowerCase();
}
