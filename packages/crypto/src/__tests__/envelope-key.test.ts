import { describe, expect, it } from 'vitest';

import { unwrapDek, type WrappedKey, wrapDek } from '../envelope-key';
import { generateVaultKeyPair } from '../vault-key';
import { BASE64_RE } from './constants';
import { mockWrappedKey, randomDek } from './crypto-helpers';

describe('envelope key', () => {
  it('round-trips a DEK', async () => {
    const recipient = generateVaultKeyPair();
    const dek = randomDek();

    const wrapped = await wrapDek(dek, recipient.publicKey);
    const decrypted = await unwrapDek(wrapped, recipient.privateKey);

    expect(decrypted).toEqual(dek);
  });

  it('returns the wire-format fields', async () => {
    const recipient = generateVaultKeyPair();
    const wrapped = await wrapDek(randomDek(), recipient.publicKey);

    expect(wrapped.v).toBe(1);
    expect(wrapped.ek).toMatch(BASE64_RE);
    expect(wrapped.epk).toMatch(/^[0-9a-f]{64}$/);
    expect(wrapped.kemCt).toMatch(BASE64_RE);
    expect(wrapped.iv).toMatch(BASE64_RE);
    expect(wrapped.iv).toHaveLength(16); // 12 bytes base64
  });

  it('fails with another recipient private key', async () => {
    const recipient = generateVaultKeyPair();
    const otherRecipient = generateVaultKeyPair();
    const wrapped = await wrapDek(randomDek(), recipient.publicKey);

    await expect(unwrapDek(wrapped, otherRecipient.privateKey)).rejects.toThrow();
  });

  it('rejects unsupported versions before decrypting', async () => {
    const recipient = generateVaultKeyPair();
    const wrapped = await wrapDek(randomDek(), recipient.publicKey);

    await expect(unwrapDek({ ...wrapped, v: 2 } as unknown as WrappedKey, recipient.privateKey)).rejects.toThrow(
      'Unsupported crypto suite version: 2',
    );
  });

  it('binds a wrapped DEK to its AAD', async () => {
    const recipient = generateVaultKeyPair();
    const dek = randomDek();
    const aad = new TextEncoder().encode('application_answers:app-1:org_vault');
    const wrongAad = new TextEncoder().encode('application_answers:app-1:applicant');

    const wrapped = await wrapDek(dek, recipient.publicKey, aad);

    await expect(unwrapDek(wrapped, recipient.privateKey, aad)).resolves.toEqual(dek);
    await expect(unwrapDek(wrapped, recipient.privateKey, wrongAad)).rejects.toThrow();
    await expect(unwrapDek(wrapped, recipient.privateKey)).rejects.toThrow();
  });

  it('requires 32-byte key material', async () => {
    const recipient = generateVaultKeyPair();

    await expect(wrapDek(new Uint8Array(16), recipient.publicKey)).rejects.toThrow('DEK must be 32 bytes');
    await expect(unwrapDek(mockWrappedKey(), new Uint8Array(16))).rejects.toThrow('Private key must be 32 bytes');
  });
});
