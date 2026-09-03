import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

const textEncoder = new TextEncoder();

/**
 * HMAC key for tag blind indexes, derived from the vault private key (HKDF).
 * `comitium-tag-hash-v1` info wire-frozen — changing it orphans every stored hash.
 */
export function deriveTagHashKey(vaultPrivateKey: Uint8Array): Uint8Array {
  return hkdf(sha256, vaultPrivateKey, new Uint8Array(0), textEncoder.encode('comitium-tag-hash-v1'), 32);
}

/**
 * HMAC-SHA256 blind index for a tag label; label MUST be pre-normalized via `normalizeTagLabel`.
 */
export function hmacTagLabel(tagHashKey: Uint8Array, normalizedLabel: string): string {
  return bytesToHex(hmac(sha256, tagHashKey, textEncoder.encode(normalizedLabel)));
}

/**
 * Canonical HMAC input for tag labels.
 * Wire contract — write and lookup paths must both run it so identical labels hash equal.
 */
export function normalizeTagLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLowerCase();
}
