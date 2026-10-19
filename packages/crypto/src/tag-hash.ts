import { createBlindIndexDigest } from './blind-index';
import { WHITESPACE_RUN_REGEX } from './patterns';

const TAG_HASH_NAMESPACE = 'comitium-tag-hash-v1';
const EMPTY_SALT = new Uint8Array(0);

/**
 * `TAG_HASH_NAMESPACE` is wire-frozen — changing it orphans every stored hash.
 */
export function hashTagLabel(searchKey: Uint8Array, label: string): string {
  return createBlindIndexDigest(searchKey, EMPTY_SALT, TAG_HASH_NAMESPACE, normalizeTagLabel(label));
}

/**
 * Canonical HMAC input for tag labels.
 * Wire contract — write and lookup paths must both run it so identical labels hash equal.
 */
export function normalizeTagLabel(label: string): string {
  return label.replace(WHITESPACE_RUN_REGEX, ' ').trim().toLowerCase();
}
