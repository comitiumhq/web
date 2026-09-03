import { bytesToHex } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import type { Address, Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  canonicalizeEvmSignature,
  generatePersonalKeyPair,
  unwrapPersonalKey,
  type WrappedPersonalKey,
  walletSignatureWrapperId,
  wrapPersonalKey,
} from '../personal-key';
import { publicEncryptionKeySchema } from '../schemas';
import { BASE64_RE } from './constants';
import { TEST_ADDRESS, TEST_SIGNATURE, tamperBase64 } from './crypto-helpers';

const SECP256K1_ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const EIP_2098_Y_PARITY_FLAG = 1n << 255n;
const TEST_KEY_SHARE = base64.encode(new Uint8Array(32).fill(7));
const OTHER_KEY_SHARE = base64.encode(new Uint8Array(32).fill(8));

function paddedHex(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function signature(r: bigint, s: bigint, v: number): Hex {
  return `0x${paddedHex(r)}${paddedHex(s)}${v.toString(16)}`;
}

describe('personal key', () => {
  describe('generatePersonalKeyPair', () => {
    it('returns 32-byte private key and X-Wing public key bundle', () => {
      const { privateKey, publicKey } = generatePersonalKeyPair();

      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toHaveLength(32);
      expect(publicEncryptionKeySchema.safeParse(publicKey).success).toBe(true);
    });

    it('generates unique keypairs', () => {
      const kp1 = generatePersonalKeyPair();
      const kp2 = generatePersonalKeyPair();

      expect(bytesToHex(kp1.privateKey)).not.toBe(bytesToHex(kp2.privateKey));
      expect(kp1.publicKey.xwing).not.toBe(kp2.publicKey.xwing);
    });
  });

  describe('wrapPersonalKey / unwrapPersonalKey', () => {
    it('round-trips personal key', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const original = Uint8Array.from(privateKey); // copy before potential fill(0)

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);
      const decrypted = await unwrapPersonalKey(encrypted, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      expect(decrypted).toEqual(original);
    });

    it('handles 0x-prefixed and bare signatures', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const original = Uint8Array.from(privateKey);
      const bareSig = TEST_SIGNATURE.slice(2);

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);
      const decrypted = await unwrapPersonalKey(encrypted, bareSig, TEST_ADDRESS, TEST_KEY_SHARE);

      expect(decrypted).toEqual(original);
    });

    it('returns correct WrappedPersonalKey structure', async () => {
      const { privateKey } = generatePersonalKeyPair();

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      expect(encrypted.v).toBe(1);
      expect(encrypted.pk.ek).toMatch(BASE64_RE);
      expect(encrypted.pk.iv).toMatch(BASE64_RE);
      expect(encrypted.pk.iv).toHaveLength(16);
      expect(encrypted.wraps).toHaveLength(1);
      expect(encrypted.wraps[0]).toMatchObject({
        method: 'wallet_signature',
        kdf: 'signature+share',
        id: walletSignatureWrapperId(TEST_ADDRESS),
      });
      expect(encrypted.wraps[0].ek).toMatch(BASE64_RE);
      expect(encrypted.wraps[0].iv).toMatch(BASE64_RE);
      expect(encrypted.wraps[0].iv).toHaveLength(16);
      expect(encrypted.wraps[0].salt).toMatch(BASE64_RE);
      expect(encrypted.wraps[0].salt).toHaveLength(44);
    });

    it('generates unique personal-key and signature-wrapper ciphertext each time', async () => {
      const { privateKey } = generatePersonalKeyPair();

      const enc1 = await wrapPersonalKey(Uint8Array.from(privateKey), TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);
      const enc2 = await wrapPersonalKey(Uint8Array.from(privateKey), TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      expect(enc1.pk.ek).not.toBe(enc2.pk.ek);
      expect(enc1.wraps[0].salt).not.toBe(enc2.wraps[0].salt);
      expect(enc1.wraps[0].ek).not.toBe(enc2.wraps[0].ek);
    });

    it('fails to unwrap with wrong signature', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const wrongSig = `0x${'33'.repeat(32)}${'44'.repeat(32)}1b`;

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      await expect(unwrapPersonalKey(encrypted, wrongSig, TEST_ADDRESS, TEST_KEY_SHARE)).rejects.toThrow();
    });

    it('fails to unwrap with wrong address', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const wrongAddress = '0x25ca1c416726F26e149a26b0C334e81564229814' as Address;

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      await expect(unwrapPersonalKey(encrypted, TEST_SIGNATURE, wrongAddress, TEST_KEY_SHARE)).rejects.toThrow();
    });

    it('treats the key share as load-bearing: same signature, different share cannot unwrap', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const original = Uint8Array.from(privateKey);

      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      await expect(unwrapPersonalKey(encrypted, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE)).resolves.toEqual(
        original,
      );
      await expect(unwrapPersonalKey(encrypted, TEST_SIGNATURE, TEST_ADDRESS, OTHER_KEY_SHARE)).rejects.toThrow();
    });

    it('rejects a key share that is not 32 bytes', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const shortShare = base64.encode(new Uint8Array(31).fill(7));

      await expect(wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, shortShare)).rejects.toThrow(
        'Key share must be 32 bytes',
      );
    });

    it('rejects a legacy signature-only wrapper kdf at runtime', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      const legacyWrapper = {
        ...encrypted,
        wraps: [{ ...encrypted.wraps[0], kdf: 'signature' }],
      } as unknown as WrappedPersonalKey;

      await expect(unwrapPersonalKey(legacyWrapper, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE)).rejects.toThrow(
        'Unsupported wallet signature wrapper kdf',
      );
    });

    it('fails to unwrap with tampered ek', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      const tampered: WrappedPersonalKey = {
        ...encrypted,
        pk: {
          ...encrypted.pk,
          ek: tamperBase64(encrypted.pk.ek),
        },
      };

      await expect(unwrapPersonalKey(tampered, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE)).rejects.toThrow();
    });

    it('rejects unsupported wrapped personal key versions before decrypt', async () => {
      const { privateKey } = generatePersonalKeyPair();
      const encrypted = await wrapPersonalKey(privateKey, TEST_SIGNATURE, TEST_ADDRESS, TEST_KEY_SHARE);

      await expect(
        unwrapPersonalKey(
          { ...encrypted, v: 2 } as unknown as WrappedPersonalKey,
          TEST_SIGNATURE,
          TEST_ADDRESS,
          TEST_KEY_SHARE,
        ),
      ).rejects.toThrow('Unsupported crypto suite version: 2');
    });

    it('does not accept the removed flat wrapped personal key shape', async () => {
      const flatWrappedPersonalKey = {
        v: 1,
        ek: 'AQIDBA==',
        iv: 'AAAAAAAAAAAAAAAA',
        salt: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      };

      await expect(
        unwrapPersonalKey(
          flatWrappedPersonalKey as unknown as WrappedPersonalKey,
          TEST_SIGNATURE,
          TEST_ADDRESS,
          TEST_KEY_SHARE,
        ),
      ).rejects.toThrow();
    });
  });

  describe('canonicalizeEvmSignature', () => {
    it('normalizes bare signatures and v 0/1 to 27/28', () => {
      const withV0 = `${'11'.repeat(32)}${'22'.repeat(32)}00`;
      const withV1 = `0x${'11'.repeat(32)}${'22'.repeat(32)}01`;

      expect(canonicalizeEvmSignature(withV0)).toBe(`0x${'11'.repeat(32)}${'22'.repeat(32)}1b`);
      expect(canonicalizeEvmSignature(withV1)).toBe(`0x${'11'.repeat(32)}${'22'.repeat(32)}1c`);
    });

    it('rejects high-s signatures', () => {
      const highS = SECP256K1_ORDER - 2n;

      expect(() => canonicalizeEvmSignature(signature(1n, highS, 28))).toThrow('Invalid EVM signature high-s value');
    });

    it('accepts EIP-2098 compact signatures', () => {
      const r = 1n;
      const s = 2n;
      const compactS = s | EIP_2098_Y_PARITY_FLAG;
      const compactSignature = `0x${paddedHex(r)}${paddedHex(compactS)}`;

      expect(canonicalizeEvmSignature(compactSignature)).toBe(signature(r, s, 28));
    });

    it('rejects malformed signatures', () => {
      expect(() => canonicalizeEvmSignature('0xzz')).toThrow('Invalid EVM signature hex');
      expect(() => canonicalizeEvmSignature('0x1234')).toThrow('Invalid EVM signature length');
      expect(() => canonicalizeEvmSignature(`0x${'11'.repeat(32)}${'22'.repeat(32)}1d`)).toThrow();
      expect(() => canonicalizeEvmSignature(signature(0n, 2n, 27))).toThrow();
      expect(() => canonicalizeEvmSignature(signature(1n, 0n, 27))).toThrow();
    });
  });
});
