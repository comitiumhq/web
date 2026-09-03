import { describe, expect, it } from 'vitest';
import type { CryptoContextInput } from '../context';
import {
  decryptEmailContentWithPersonalKey,
  decryptEmailContentWithVaultKey,
  type EncryptedEnvelope,
  encryptEmailContent,
  encryptEmailContentWithOverlays,
} from '../email-encryption';
import { decryptEnvelope } from '../envelope';
import { applicantRecipient, orgVaultRecipient, processorRecipient } from '../recipients';
import type { EnvelopeKey } from '../schemas';
import { generateVaultKeyPair } from '../vault-key';
import { BASE64_RE } from './constants';
import { TEST_KEYS, tamperBase64, tamperHex } from './crypto-helpers';

describe('email-encryption', () => {
  const emailContext: CryptoContextInput = {
    purpose: 'email_content',
    orgId: 'org-1',
    subjectId: 'thread-1',
    fieldId: 'email-1',
  };

  const wrongEmailContext: CryptoContextInput = {
    ...emailContext,
    fieldId: 'email-2',
  };

  function setupKeys() {
    const vault = generateVaultKeyPair();

    return {
      vaultPublicKey: vault.publicKey,
      vaultPrivateKey: vault.privateKey,
      applicantPublicKey: TEST_KEYS.alice.publicKey,
      applicantPrivateKey: TEST_KEYS.alice.privateKey,
    };
  }

  function encryptTestEmail(keys: ReturnType<typeof setupKeys>, data: unknown): Promise<EncryptedEnvelope> {
    return encryptEmailContent(data, emailContext, [
      orgVaultRecipient(keys.vaultPublicKey, 1),
      applicantRecipient(keys.applicantPublicKey),
    ]);
  }

  describe('encryptEmailContent', () => {
    it('returns correct EncryptedEnvelope structure', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'Hello' });
      const vaultKey = keyFor(encrypted, 'org_vault');
      const applicantKey = keyFor(encrypted, 'applicant');

      expect(encrypted.v).toBe(1);
      expect(encrypted.purpose).toBe('email_content');
      expect(encrypted.ct).toMatch(BASE64_RE);
      expect(encrypted.iv).toMatch(BASE64_RE);
      expect(encrypted.iv).toHaveLength(16); // 12 bytes base64
      expect(encrypted.keys.map((key) => key.recipient)).toEqual(['org_vault', 'applicant']);
      expect(vaultKey.ek).toMatch(BASE64_RE);
      expect(vaultKey.epk).toMatch(/^[0-9a-f]{64}$/);
      expect(vaultKey.iv).toMatch(BASE64_RE);
      expect(vaultKey.iv).toHaveLength(16);

      expect(applicantKey.ek).toMatch(BASE64_RE);
      expect(applicantKey.epk).toMatch(/^[0-9a-f]{64}$/);
      expect(applicantKey.iv).toMatch(BASE64_RE);
      expect(applicantKey.iv).toHaveLength(16);
    });

    it('vault and applicant DEK wrappers are distinct', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'Hello' });

      expect(keyFor(encrypted, 'org_vault').epk).not.toBe(keyFor(encrypted, 'applicant').epk);
      expect(keyFor(encrypted, 'org_vault').ek).not.toBe(keyFor(encrypted, 'applicant').ek);
    });

    it('binds envelope to CryptoContext AAD', async () => {
      const keys = setupKeys();
      const data = { text: 'Hello with context' };

      const encrypted = await encryptTestEmail(keys, data);
      const vaultDecrypted = await decryptEmailContentWithVaultKey(encrypted, keys.vaultPrivateKey, emailContext);
      const applicantDecrypted = await decryptEmailContentWithPersonalKey(
        encrypted,
        keys.applicantPrivateKey,
        emailContext,
      );

      expect(vaultDecrypted).toEqual(data);
      expect(applicantDecrypted).toEqual(data);
      await expect(
        decryptEmailContentWithVaultKey(encrypted, keys.vaultPrivateKey, wrongEmailContext),
      ).rejects.toThrow();
      await expect(
        decryptEmailContentWithPersonalKey(encrypted, keys.applicantPrivateKey, wrongEmailContext),
      ).rejects.toThrow();
    });

    it('returns processor overlay keys without storing them in the email envelope', async () => {
      const keys = setupKeys();
      const processor = generateVaultKeyPair();
      const data = { text: 'Process this email once' };
      const encrypted = await encryptEmailContentWithOverlays(
        data,
        emailContext,
        [orgVaultRecipient(keys.vaultPublicKey, 1), applicantRecipient(keys.applicantPublicKey)],
        [processorRecipient('grant-1', processor.publicKey)],
      );

      expect(encrypted.envelope.keys.map((key) => key.recipient)).toEqual(['org_vault', 'applicant']);
      expect(encrypted.overlayKeys.map((key) => key.recipient)).toEqual(['processor:grant-1']);

      const processorEnvelope: EncryptedEnvelope = {
        ...encrypted.envelope,
        keys: [...encrypted.envelope.keys, ...encrypted.overlayKeys],
      };
      const processorDecrypted = await decryptEnvelope(processorEnvelope, emailContext, {
        recipient: 'processor:grant-1',
        privateKey: processor.privateKey,
      });

      expect(await decryptEmailContentWithVaultKey(encrypted.envelope, keys.vaultPrivateKey, emailContext)).toEqual(
        data,
      );
      expect(
        await decryptEmailContentWithPersonalKey(encrypted.envelope, keys.applicantPrivateKey, emailContext),
      ).toEqual(data);
      expect(processorDecrypted).toEqual(data);
    });
  });

  describe('decrypt with vault key', () => {
    it('decrypts email content correctly', async () => {
      const keys = setupKeys();
      const data = { text: 'Response from employer', rating: 5 };

      const encrypted = await encryptTestEmail(keys, data);

      const decrypted = await decryptEmailContentWithVaultKey(encrypted, keys.vaultPrivateKey, emailContext);

      expect(decrypted).toEqual(data);
    });

    it('fails with wrong vault key', async () => {
      const keys = setupKeys();
      const wrongVault = generateVaultKeyPair();

      const encrypted = await encryptTestEmail(keys, { secret: true });

      await expect(decryptEmailContentWithVaultKey(encrypted, wrongVault.privateKey, emailContext)).rejects.toThrow();
    });
  });

  describe('decrypt with personal key', () => {
    it('decrypts email content correctly', async () => {
      const keys = setupKeys();
      const data = { text: 'Response from employer', rating: 5 };

      const encrypted = await encryptTestEmail(keys, data);

      const decrypted = await decryptEmailContentWithPersonalKey(encrypted, keys.applicantPrivateKey, emailContext);

      expect(decrypted).toEqual(data);
    });

    it('fails with wrong personal key', async () => {
      const keys = setupKeys();

      const encrypted = await encryptTestEmail(keys, { secret: true });

      await expect(
        decryptEmailContentWithPersonalKey(encrypted, TEST_KEYS.bob.privateKey, emailContext),
      ).rejects.toThrow();
    });
  });

  describe('cross-decryption: both recipients decrypt same data', () => {
    it('vault and applicant decrypt to identical plaintext', async () => {
      const keys = setupKeys();
      const data = {
        message: 'Thank you for your application',
        timestamp: Date.now(),
        metadata: { type: 'response' },
      };

      const encrypted = await encryptTestEmail(keys, data);

      const vaultDecrypted = await decryptEmailContentWithVaultKey(encrypted, keys.vaultPrivateKey, emailContext);
      const applicantDecrypted = await decryptEmailContentWithPersonalKey(
        encrypted,
        keys.applicantPrivateKey,
        emailContext,
      );

      expect(vaultDecrypted).toEqual(data);
      expect(applicantDecrypted).toEqual(data);
      expect(vaultDecrypted).toEqual(applicantDecrypted);
    });
  });

  describe('tamper resistance', () => {
    it('fails on tampered ciphertext', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'original' });

      const tampered: EncryptedEnvelope = {
        ...encrypted,
        ct: tamperBase64(encrypted.ct),
      };

      await expect(decryptEmailContentWithVaultKey(tampered, keys.vaultPrivateKey, emailContext)).rejects.toThrow();
      await expect(
        decryptEmailContentWithPersonalKey(tampered, keys.applicantPrivateKey, emailContext),
      ).rejects.toThrow();
    });

    it('fails on tampered vault DEK wrapper', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'original' });

      const tampered: EncryptedEnvelope = {
        ...encrypted,
        keys: encrypted.keys.map((key) => (key.recipient === 'org_vault' ? { ...key, ek: tamperBase64(key.ek) } : key)),
      };

      await expect(decryptEmailContentWithVaultKey(tampered, keys.vaultPrivateKey, emailContext)).rejects.toThrow();
      // Applicant side should still work (its DEK wrapper is untouched)
      const applicantDecrypted = await decryptEmailContentWithPersonalKey(
        tampered,
        keys.applicantPrivateKey,
        emailContext,
      );

      expect(applicantDecrypted).toEqual({ text: 'original' });
    });

    it('fails on tampered vault DEK wrapper kemCt (ML-KEM half)', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'original' });

      const tampered: EncryptedEnvelope = {
        ...encrypted,
        keys: encrypted.keys.map((key) =>
          key.recipient === 'org_vault' ? { ...key, kemCt: tamperBase64(key.kemCt) } : key,
        ),
      };

      await expect(decryptEmailContentWithVaultKey(tampered, keys.vaultPrivateKey, emailContext)).rejects.toThrow();
      // Applicant DEK wrapper is untouched, so its ML-KEM half still decapsulates.
      expect(await decryptEmailContentWithPersonalKey(tampered, keys.applicantPrivateKey, emailContext)).toEqual({
        text: 'original',
      });
    });

    it('fails on tampered vault DEK wrapper epk (X25519 half)', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'original' });

      const tampered: EncryptedEnvelope = {
        ...encrypted,
        keys: encrypted.keys.map((key) => (key.recipient === 'org_vault' ? { ...key, epk: tamperHex(key.epk) } : key)),
      };

      await expect(decryptEmailContentWithVaultKey(tampered, keys.vaultPrivateKey, emailContext)).rejects.toThrow();
      // Applicant DEK wrapper is untouched, so its X25519 half still decapsulates.
      expect(await decryptEmailContentWithPersonalKey(tampered, keys.applicantPrivateKey, emailContext)).toEqual({
        text: 'original',
      });
    });

    it('fails on tampered envelope iv', async () => {
      const keys = setupKeys();
      const encrypted = await encryptTestEmail(keys, { text: 'original' });

      const tampered: EncryptedEnvelope = {
        ...encrypted,
        iv: tamperBase64(encrypted.iv),
      };

      await expect(decryptEmailContentWithVaultKey(tampered, keys.vaultPrivateKey, emailContext)).rejects.toThrow();
      await expect(
        decryptEmailContentWithPersonalKey(tampered, keys.applicantPrivateKey, emailContext),
      ).rejects.toThrow();
    });
  });
});

function keyFor(envelope: EncryptedEnvelope, recipient: EnvelopeKey['recipient']): EnvelopeKey {
  const key = envelope.keys.find((candidate) => candidate.recipient === recipient);

  if (!key) {
    throw new Error(`Missing test key for ${recipient}`);
  }

  return key;
}
