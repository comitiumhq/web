import { describe, expect, it } from 'vitest';
import {
  decryptApplicationWithVaultKey,
  type EncryptedEnvelope,
  encryptApplicationWithVaultKey,
} from '../application-encryption';
import type { CryptoContextInput } from '../context';
import type { EnvelopeKey } from '../schemas';
import { generateVaultKeyPair } from '../vault-key';
import { BASE64_RE } from './constants';
import { sampleFormData, tamperBase64, tamperHex } from './crypto-helpers';

describe('application-encryption (envelope encryption)', () => {
  const applicationContext: CryptoContextInput = {
    purpose: 'application_answers',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'private_fields',
  };

  const wrongApplicationContext: CryptoContextInput = {
    ...applicationContext,
    subjectId: 'application-2',
  };

  it('round-trips application form data', async () => {
    const vault = generateVaultKeyPair();
    const data = sampleFormData();

    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);
    const decrypted = await decryptApplicationWithVaultKey(encrypted, vault.privateKey, applicationContext);

    expect(decrypted).toEqual(data);
  });

  it('round-trips simple object', async () => {
    const vault = generateVaultKeyPair();
    const data = { hello: 'world' };

    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);
    const decrypted = await decryptApplicationWithVaultKey(encrypted, vault.privateKey, applicationContext);

    expect(decrypted).toEqual(data);
  });

  it('binds application envelope to CryptoContext AAD', async () => {
    const vault = generateVaultKeyPair();
    const data = sampleFormData();

    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);
    const decrypted = await decryptApplicationWithVaultKey(encrypted, vault.privateKey, applicationContext);

    expect(decrypted).toEqual(data);
    await expect(
      decryptApplicationWithVaultKey(encrypted, vault.privateKey, wrongApplicationContext),
    ).rejects.toThrow();
  });

  it('round-trips unicode data', async () => {
    const vault = generateVaultKeyPair();
    const data = {
      name: 'Привет мир',
      emoji: '👋🔐',
      chinese: '你好世界',
    };

    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);
    const decrypted = await decryptApplicationWithVaultKey(encrypted, vault.privateKey, applicationContext);

    expect(decrypted).toEqual(data);
  });

  it('returns correct EncryptedEnvelope structure', async () => {
    const vault = generateVaultKeyPair();
    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, { x: 1 }, applicationContext);
    const key = keyFor(encrypted, 'org_vault');

    expect(encrypted.v).toBe(1);
    expect(encrypted.purpose).toBe('application_answers');
    expect(encrypted.ct).toMatch(BASE64_RE);
    expect(encrypted.iv).toMatch(BASE64_RE);
    expect(encrypted.iv).toHaveLength(16); // 12 bytes base64
    expect(encrypted.keys).toHaveLength(1);
    expect(key.ek).toMatch(BASE64_RE);
    expect(key.epk).toMatch(/^[0-9a-f]{64}$/);
    expect(key.kemCt).toMatch(BASE64_RE);
    expect(key.iv).toMatch(BASE64_RE);
    expect(key.iv).toHaveLength(16); // 12 bytes base64
  });

  it('produces unique ciphertext each time (fresh DEK)', async () => {
    const vault = generateVaultKeyPair();
    const data = sampleFormData();

    const enc1 = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);
    const enc2 = await encryptApplicationWithVaultKey(vault.publicKey, 1, data, applicationContext);

    expect(enc1.ct).not.toBe(enc2.ct);
    expect(keyFor(enc1, 'org_vault').ek).not.toBe(keyFor(enc2, 'org_vault').ek);
    expect(keyFor(enc1, 'org_vault').epk).not.toBe(keyFor(enc2, 'org_vault').epk);
    expect(keyFor(enc1, 'org_vault').kemCt).not.toBe(keyFor(enc2, 'org_vault').kemCt);
  });

  it('fails to decrypt with wrong vault private key', async () => {
    const vault1 = generateVaultKeyPair();
    const vault2 = generateVaultKeyPair();
    const data = sampleFormData();

    const encrypted = await encryptApplicationWithVaultKey(vault1.publicKey, 1, data, applicationContext);

    await expect(decryptApplicationWithVaultKey(encrypted, vault2.privateKey, applicationContext)).rejects.toThrow();
  });

  it('fails to decrypt with tampered ciphertext', async () => {
    const vault = generateVaultKeyPair();
    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, { secret: true }, applicationContext);

    const tampered: EncryptedEnvelope = {
      ...encrypted,
      ct: tamperBase64(encrypted.ct),
    };

    await expect(decryptApplicationWithVaultKey(tampered, vault.privateKey, applicationContext)).rejects.toThrow();
  });

  it('fails to decrypt with tampered wrapped key', async () => {
    const vault = generateVaultKeyPair();
    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, { secret: true }, applicationContext);

    const tampered: EncryptedEnvelope = {
      ...encrypted,
      keys: encrypted.keys.map((key) => (key.recipient === 'org_vault' ? { ...key, ek: tamperBase64(key.ek) } : key)),
    };

    await expect(decryptApplicationWithVaultKey(tampered, vault.privateKey, applicationContext)).rejects.toThrow();
  });

  it('fails to decrypt when the wrapped-key kemCt (ML-KEM half) is tampered', async () => {
    const vault = generateVaultKeyPair();
    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, { secret: true }, applicationContext);

    const tampered: EncryptedEnvelope = {
      ...encrypted,
      keys: encrypted.keys.map((key) =>
        key.recipient === 'org_vault' ? { ...key, kemCt: tamperBase64(key.kemCt) } : key,
      ),
    };

    await expect(decryptApplicationWithVaultKey(tampered, vault.privateKey, applicationContext)).rejects.toThrow();
  });

  it('fails to decrypt when the wrapped-key epk (X25519 half) is tampered', async () => {
    const vault = generateVaultKeyPair();
    const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, { secret: true }, applicationContext);

    const tampered: EncryptedEnvelope = {
      ...encrypted,
      keys: encrypted.keys.map((key) => (key.recipient === 'org_vault' ? { ...key, epk: tamperHex(key.epk) } : key)),
    };

    await expect(decryptApplicationWithVaultKey(tampered, vault.privateKey, applicationContext)).rejects.toThrow();
  });
});

function keyFor(envelope: EncryptedEnvelope, recipient: EnvelopeKey['recipient']): EnvelopeKey {
  const key = envelope.keys.find((candidate) => candidate.recipient === recipient);

  if (!key) {
    throw new Error(`Missing test key for ${recipient}`);
  }

  return key;
}
