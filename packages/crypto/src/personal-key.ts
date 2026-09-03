import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import {
  type Address,
  compactSignatureToSignature,
  type Hex,
  parseCompactSignature,
  parseSignature,
  type Signature,
  serializeSignature,
} from 'viem';
import { z } from 'zod';
import { aesGcmIvSchema, base64BytesSchema, base64StringSchema, type PublicEncryptionKey } from './schemas';
import { ALGORITHM_SUITE_VERSION, assertSupportedAlgorithmSuiteVersion } from './version';
import { deserializePrivateEncryptionKey, generateXWingKeyPair, serializePrivateEncryptionKey } from './xwing';

export type CanonicalEvmSignature = Hex;

const WALLET_SIGNATURE_KDF_NAMESPACE = 'comitium.personal-key-wrapping';
const KEY_SHARE_BYTES = 32;
const WRAPPER_SALT_BYTES = 32;
const HEX_REGEX = /^[a-fA-F0-9]+$/;
const PERSONAL_KEY_WRAPPER_ID_REGEX = /^evm:0x[a-f0-9]{40}$/;

export const walletSignaturePersonalKeyWrapperSchema = z
  .object({
    method: z.literal('wallet_signature'),
    kdf: z.literal('signature+share'),
    id: z.string().regex(PERSONAL_KEY_WRAPPER_ID_REGEX, 'Expected personal key wrapper id'),
    ek: base64StringSchema,
    iv: aesGcmIvSchema,
    salt: base64BytesSchema(32, 'Expected 32-byte HKDF salt encoded as base64'),
  })
  .strict();

export const wrappedPersonalKeySchema = z
  .object({
    v: z.literal(ALGORITHM_SUITE_VERSION),
    pk: z.object({ ek: base64StringSchema, iv: aesGcmIvSchema }).strict(),
    wraps: z.array(walletSignaturePersonalKeyWrapperSchema).min(1),
  })
  .strict();

export type WalletSignaturePersonalKeyWrapper = z.infer<typeof walletSignaturePersonalKeyWrapperSchema>;
export type WrappedPersonalKey = z.infer<typeof wrappedPersonalKeySchema>;

export function generatePersonalKeyPair(): { privateKey: Uint8Array; publicKey: PublicEncryptionKey } {
  return generateXWingKeyPair();
}

/**
 * Canonicalize an EVM signature to low-S before its bytes seed the personal-key HKDF.
 * ECDSA is malleable — a high-S variant derives a different key and locks the user out.
 */
export function canonicalizeEvmSignature(signature: string): CanonicalEvmSignature {
  const hexSignature = toHexSignature(signature);
  const parsedSignature = parseEvmSignature(hexSignature);

  assertLowSSignature(parsedSignature);

  return serializeSignature(parsedSignature) as CanonicalEvmSignature;
}

export function walletSignatureWrapperId(address: Address | string): `evm:${string}` {
  return `evm:${address.toLowerCase()}`;
}

/**
 * Wrap a personal private key two-layer: signature+share → PersonalKeyWrappingKey → personal key.
 * The indirection lets remembered-device unlock reuse the same random wrapping key.
 */
export async function wrapPersonalKey(
  privateKey: Uint8Array,
  signature: string,
  address: Address,
  keyShare: string,
): Promise<WrappedPersonalKey> {
  const personalKeyWrappingKey = randomBytes(32);
  const serializedPrivateKey = serializePrivateEncryptionKey(privateKey);

  try {
    const pk = await encryptWithRawAesKey(personalKeyWrappingKey, serializedPrivateKey);
    const walletSignatureWrapper = await wrapPersonalKeyWrappingKey(
      personalKeyWrappingKey,
      signature,
      address,
      keyShare,
    );

    return {
      v: ALGORITHM_SUITE_VERSION,
      pk,
      wraps: [walletSignatureWrapper],
    };
  } finally {
    serializedPrivateKey.fill(0);
    personalKeyWrappingKey.fill(0);
  }
}

/**
 * Unwrap personal private key: signature+share → PersonalKeyWrappingKey → personal key.
 */
export async function unwrapPersonalKey(
  wrapped: WrappedPersonalKey,
  signature: string,
  address: Address,
  keyShare: string,
): Promise<Uint8Array> {
  const result = await unwrapPersonalKeyWithWrappingKey(wrapped, signature, address, keyShare);

  try {
    return result.personalKey;
  } finally {
    result.personalKeyWrappingKey.fill(0);
  }
}

/**
 * Reverse the two-layer scheme, returning the personal key and the intermediate PersonalKeyWrappingKey.
 * Wrapping-key ownership transfers to the caller, who MUST zero it.
 */
export async function unwrapPersonalKeyWithWrappingKey(
  wrapped: WrappedPersonalKey,
  signature: string,
  address: Address,
  keyShare: string,
): Promise<{ personalKey: Uint8Array; personalKeyWrappingKey: Uint8Array }> {
  assertSupportedAlgorithmSuiteVersion(wrapped.v);

  const walletSignatureWrapper = wrapped.wraps.find(
    (wrapper) => wrapper.method === 'wallet_signature' && wrapper.id === walletSignatureWrapperId(address),
  );

  if (!walletSignatureWrapper) {
    throw new Error('Wallet signature wrapper not found');
  }

  const personalKeyWrappingKey = await unwrapPersonalKeyWrappingKey(
    walletSignatureWrapper,
    signature,
    address,
    keyShare,
  );

  try {
    const personalKey = await decryptPersonalKeyWithWrappingKey(wrapped, personalKeyWrappingKey);

    return { personalKey, personalKeyWrappingKey };
  } catch (error) {
    personalKeyWrappingKey.fill(0);

    throw error;
  }
}

/**
 * Decrypt the personal private key once any unlock path (signature+share or remembered device)
 * has recovered the PersonalKeyWrappingKey.
 */
export async function decryptPersonalKeyWithWrappingKey(
  wrapped: WrappedPersonalKey,
  personalKeyWrappingKey: Uint8Array,
): Promise<Uint8Array> {
  assertSupportedAlgorithmSuiteVersion(wrapped.v);

  const serializedPrivateKey = await decryptWithRawAesKey(personalKeyWrappingKey, wrapped.pk);

  try {
    return deserializePrivateEncryptionKey(serializedPrivateKey);
  } finally {
    serializedPrivateKey.fill(0);
  }
}

async function wrapPersonalKeyWrappingKey(
  personalKeyWrappingKey: Uint8Array,
  signature: string,
  address: Address,
  keyShare: string,
): Promise<WalletSignaturePersonalKeyWrapper> {
  const salt = randomBytes(WRAPPER_SALT_BYTES);
  const saltEncoded = base64.encode(salt);
  const signatureWrappingKey = await deriveWalletSignatureWrappingKey(signature, address, keyShare, saltEncoded, [
    'encrypt',
  ]);
  const encrypted = await encryptWithCryptoKey(signatureWrappingKey, personalKeyWrappingKey);

  return {
    method: 'wallet_signature',
    kdf: 'signature+share',
    id: walletSignatureWrapperId(address),
    ...encrypted,
    salt: saltEncoded,
  };
}

async function unwrapPersonalKeyWrappingKey(
  wrapper: WalletSignaturePersonalKeyWrapper,
  signature: string,
  address: Address,
  keyShare: string,
): Promise<Uint8Array> {
  assertSignatureShareWrapper(wrapper);
  assertWrapperSalt(wrapper.salt);
  const signatureWrappingKey = await deriveWalletSignatureWrappingKey(signature, address, keyShare, wrapper.salt, [
    'decrypt',
  ]);

  return decryptWithCryptoKey(signatureWrappingKey, wrapper);
}

/**
 * Derive the AES-GCM key protecting the PersonalKeyWrappingKey from two required inputs:
 * canonical signature bytes plus the user key share.
 */
async function deriveWalletSignatureWrappingKey(
  signature: string,
  address: Address,
  keyShare: string,
  wrapperSalt: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const canonicalSignature = canonicalizeEvmSignature(signature);
  const sigBytes = hexToBytes(canonicalSignature.slice(2));
  const keyShareBytes = decodeKeyShare(keyShare);
  const info = new TextEncoder().encode(`${WALLET_SIGNATURE_KDF_NAMESPACE}:v2:${address.toLowerCase()}:${wrapperSalt}`);
  const keyMaterial = hkdf(sha256, sigBytes, keyShareBytes, info, 32);

  try {
    return await crypto.subtle.importKey('raw', keyMaterial as BufferSource, 'AES-GCM', false, usages);
  } finally {
    sigBytes.fill(0);
    keyShareBytes.fill(0);
    keyMaterial.fill(0);
  }
}

function assertSignatureShareWrapper(wrapper: WalletSignaturePersonalKeyWrapper): void {
  if (wrapper.kdf !== 'signature+share') {
    throw new Error('Unsupported wallet signature wrapper kdf');
  }
}

function decodeKeyShare(keyShare: string): Uint8Array {
  const keyShareBytes = base64.decode(keyShare);

  if (keyShareBytes.length !== KEY_SHARE_BYTES) {
    keyShareBytes.fill(0);

    throw new Error('Key share must be 32 bytes');
  }

  return keyShareBytes;
}

function assertWrapperSalt(salt: string): void {
  const saltBytes = base64.decode(salt);

  try {
    if (saltBytes.length !== WRAPPER_SALT_BYTES) {
      throw new Error('Wallet signature wrapper salt must be 32 bytes');
    }
  } finally {
    saltBytes.fill(0);
  }
}

async function encryptWithRawAesKey(rawKey: Uint8Array, plaintext: Uint8Array): Promise<{ ek: string; iv: string }> {
  const aesKey = await crypto.subtle.importKey('raw', rawKey as BufferSource, 'AES-GCM', false, ['encrypt']);

  return encryptWithCryptoKey(aesKey, plaintext);
}

async function decryptWithRawAesKey(rawKey: Uint8Array, encrypted: { ek: string; iv: string }): Promise<Uint8Array> {
  const aesKey = await crypto.subtle.importKey('raw', rawKey as BufferSource, 'AES-GCM', false, ['decrypt']);

  return decryptWithCryptoKey(aesKey, encrypted);
}

async function encryptWithCryptoKey(aesKey: CryptoKey, plaintext: Uint8Array): Promise<{ ek: string; iv: string }> {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    aesKey,
    plaintext as BufferSource,
  );

  return {
    ek: base64.encode(new Uint8Array(encrypted)),
    iv: base64.encode(iv),
  };
}

async function decryptWithCryptoKey(aesKey: CryptoKey, encrypted: { ek: string; iv: string }): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64.decode(encrypted.iv) as BufferSource },
    aesKey,
    base64.decode(encrypted.ek) as BufferSource,
  );

  return new Uint8Array(decrypted);
}

function toHexSignature(signature: string): Hex {
  const hex = stripHexPrefix(signature).toLowerCase();

  if (!HEX_REGEX.test(hex)) {
    throw new Error('Invalid EVM signature hex');
  }

  return `0x${hex}`;
}

function parseEvmSignature(signature: Hex): Signature {
  if (signature.length === 132) {
    return parseSignature(signature);
  }

  if (signature.length === 130) {
    return compactSignatureToSignature(parseCompactSignature(signature));
  }

  throw new Error('Invalid EVM signature length');
}

/**
 * Reject a non-canonical (high-S) secp256k1 signature.
 */
function assertLowSSignature(signature: Signature): void {
  const ecdsaSignature = new secp256k1.Signature(BigInt(signature.r), BigInt(signature.s));

  if (ecdsaSignature.hasHighS()) {
    throw new Error('Invalid EVM signature high-s value');
  }
}

function stripHexPrefix(value: string): string {
  if (value.startsWith('0x') || value.startsWith('0X')) {
    return value.slice(2);
  }

  return value;
}
