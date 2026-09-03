import { bytesToHex } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';
import type { WrappedKey } from '../envelope-key';
import type { PublicEncryptionKey } from '../index';
import { generateVaultKeyPair, grantVaultAccess, unwrapVaultKey, wrapVaultKey } from '../vault-key';
import { BASE64_RE } from './constants';
import { TEST_KEYS, tamperBase64, tamperHex } from './crypto-helpers';

describe('vault-key', () => {
  describe('generateVaultKeyPair', () => {
    it('returns byte private key and X-Wing public key bundle', () => {
      const { privateKey, publicKey } = generateVaultKeyPair();

      expect(privateKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toHaveLength(32);
      expect(publicKey.v).toBe(1);
      expect(publicKey.xwing).toMatch(BASE64_RE);
    });

    it('generates unique keypairs', () => {
      const kp1 = generateVaultKeyPair();
      const kp2 = generateVaultKeyPair();

      expect(bytesToHex(kp1.privateKey)).not.toBe(bytesToHex(kp2.privateKey));
      expect(kp1.publicKey.xwing).not.toBe(kp2.publicKey.xwing);
    });
  });

  describe('wrapVaultKey / unwrapVaultKey', () => {
    it('round-trips vault private key', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const unwrapped = await unwrapVaultKey(wrapped, TEST_KEYS.alice.privateKey);

      expect(unwrapped).toEqual(vault.privateKey);
    });

    it('returns correct WrappedKey structure', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);

      expect(wrapped.v).toBe(1);
      expect(wrapped.ek).toMatch(BASE64_RE);
      expect(wrapped.epk).toMatch(/^[0-9a-f]{64}$/);
      expect(wrapped.kemCt).toMatch(BASE64_RE);
      expect(wrapped.iv).toMatch(BASE64_RE);
      expect(wrapped.iv).toHaveLength(16); // 12 bytes base64
    });

    it('uses unique ephemeral key each time', async () => {
      const vault = generateVaultKeyPair();

      const w1 = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const w2 = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);

      expect(w1.epk).not.toBe(w2.epk);
      expect(w1.ek).not.toBe(w2.ek);
    });

    it('fails to unwrap with wrong personal key', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);

      await expect(unwrapVaultKey(wrapped, TEST_KEYS.bob.privateKey)).rejects.toThrow();
    });

    it('fails to unwrap with tampered ciphertext', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const tampered: WrappedKey = {
        ...wrapped,
        ek: tamperBase64(wrapped.ek),
      };

      await expect(unwrapVaultKey(tampered, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    });

    it('fails to unwrap with tampered kemCt (ML-KEM half)', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const tampered: WrappedKey = {
        ...wrapped,
        kemCt: tamperBase64(wrapped.kemCt),
      };

      await expect(unwrapVaultKey(tampered, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    });

    it('fails to unwrap with tampered epk (X25519 half)', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const tampered: WrappedKey = {
        ...wrapped,
        epk: tamperHex(wrapped.epk),
      };

      await expect(unwrapVaultKey(tampered, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    });

    it('fails to unwrap with tampered iv', async () => {
      const vault = generateVaultKeyPair();

      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const tampered: WrappedKey = {
        ...wrapped,
        iv: tamperBase64(wrapped.iv),
      };

      await expect(unwrapVaultKey(tampered, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    });

    it('rejects unsupported wrapped vault key versions before decrypt', async () => {
      const vault = generateVaultKeyPair();
      const wrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);

      await expect(
        unwrapVaultKey({ ...wrapped, v: 2 } as unknown as WrappedKey, TEST_KEYS.alice.privateKey),
      ).rejects.toThrow('Unsupported crypto suite version: 2');
    });

    it('rejects non-32-byte vault private key', async () => {
      await expect(wrapVaultKey(new Uint8Array([0xaa, 0xbb]), TEST_KEYS.alice.publicKey)).rejects.toThrow(
        'VaultPrivateKey must be 32 bytes',
      );
    });

    it('rejects bare X25519 recipient public keys', async () => {
      const vault = generateVaultKeyPair();

      await expect(
        wrapVaultKey(vault.privateKey, `0x${'a'.repeat(64)}` as unknown as PublicEncryptionKey),
      ).rejects.toThrow();
    });
  });

  describe('grantVaultAccess', () => {
    it('re-wraps vault key for new member', async () => {
      const vault = generateVaultKeyPair();

      const aliceWrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const bobWrapped = await grantVaultAccess(aliceWrapped, TEST_KEYS.alice.privateKey, TEST_KEYS.bob.publicKey);
      const unwrapped = await unwrapVaultKey(bobWrapped, TEST_KEYS.bob.privateKey);

      expect(unwrapped).toEqual(vault.privateKey);
    });

    it('chain grant: Alice -> Bob -> Charlie', async () => {
      const vault = generateVaultKeyPair();

      const aliceWrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const bobWrapped = await grantVaultAccess(aliceWrapped, TEST_KEYS.alice.privateKey, TEST_KEYS.bob.publicKey);
      const charlieWrapped = await grantVaultAccess(bobWrapped, TEST_KEYS.bob.privateKey, TEST_KEYS.charlie.publicKey);
      const unwrapped = await unwrapVaultKey(charlieWrapped, TEST_KEYS.charlie.privateKey);

      expect(unwrapped).toEqual(vault.privateKey);
    });

    it('original member cannot use re-wrapped key', async () => {
      const vault = generateVaultKeyPair();

      const aliceWrapped = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey);
      const bobWrapped = await grantVaultAccess(aliceWrapped, TEST_KEYS.alice.privateKey, TEST_KEYS.bob.publicKey);

      await expect(unwrapVaultKey(bobWrapped, TEST_KEYS.alice.privateKey)).rejects.toThrow();
    });
  });
});
