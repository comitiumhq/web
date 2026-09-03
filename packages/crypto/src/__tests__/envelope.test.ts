import { describe, expect, it } from 'vitest';
import type { CryptoContextInput } from '../context';
import { decryptEnvelope, encryptEnvelope, encryptEnvelopeWithOverlays } from '../envelope';
import type { RecipientDescriptor } from '../recipients';
import { applicantRecipient, orgVaultRecipient, processorRecipient } from '../recipients';
import type { EncryptedEnvelope } from '../schemas';
import { generateVaultKeyPair } from '../vault-key';
import { installCompressionStreamPolyfill } from './compression-stream-polyfill';
import { TEST_KEYS, tamperBase64, tamperHex } from './crypto-helpers';

installCompressionStreamPolyfill();

type VaultKeyPair = ReturnType<typeof generateVaultKeyPair>;

const textEncoder = new TextEncoder();

describe('encrypted envelope', () => {
  const resumeContext: CryptoContextInput = {
    purpose: 'encrypted_file',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'resume',
  };

  const emailContext: CryptoContextInput = {
    purpose: 'email_content',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'content',
  };

  const applicationContext: CryptoContextInput = {
    purpose: 'application_answers',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'answers',
  };

  it('round-trips JSON for all stored recipients', async () => {
    const vault = generateVaultKeyPair();
    const data = { subject: 'Interview', body: 'Hello' };
    const envelope = await encryptEnvelope(data, emailContext, [
      orgVaultRecipient(vault.publicKey, 1),
      applicantRecipient(TEST_KEYS.alice.publicKey),
    ]);

    const orgDecrypted = await decryptEnvelope(envelope, emailContext, {
      recipient: 'org_vault',
      privateKey: vault.privateKey,
    });
    const applicantDecrypted = await decryptEnvelope(envelope, emailContext, {
      recipient: 'applicant',
      privateKey: TEST_KEYS.alice.privateKey,
    });

    expect(orgDecrypted).toEqual(data);
    expect(applicantDecrypted).toEqual(data);
  });

  it('compresses large textual envelopes before encryption', async () => {
    const vault = generateVaultKeyPair();
    const data = compressibleCandidatePayload();
    const envelope = await encryptEnvelope(data, applicationContext, orgVaultRecipients(vault));

    expect(envelope.zip).toBe('gzip');
    expect(envelope.ct.length).toBeLessThan(jsonByteLength(data));
    await expect(decryptWithOrgVault(envelope, applicationContext, vault)).resolves.toEqual(data);
  });

  it('keeps small and non-compressible-purpose envelopes uncompressed', async () => {
    const vault = generateVaultKeyPair();
    const smallEnvelope = await encryptEnvelope({ note: 'short' }, applicationContext, orgVaultRecipients(vault));
    const fileEnvelope = await encryptEnvelope(
      { text: 'large but file-like '.repeat(400) },
      resumeContext,
      orgVaultRecipients(vault),
    );

    expect(smallEnvelope.zip).toBe('none');
    expect(fileEnvelope.zip).toBe('none');
  });

  it('authenticates compressed envelope metadata through AAD', async () => {
    const vault = generateVaultKeyPair();
    const data = compressibleMetadataPayload();
    const envelope = await encryptEnvelope(data, applicationContext, orgVaultRecipients(vault));
    const tampered: EncryptedEnvelope = { ...envelope, zip: 'none' };

    expect(envelope.zip).toBe('gzip');
    await expect(decryptWithOrgVault(tampered, applicationContext, vault)).rejects.toThrow();
  });

  it('keeps processor overlay keys out of the stored envelope', async () => {
    const vault = generateVaultKeyPair();
    const processor = generateVaultKeyPair();
    const data = { resumeText: 'Candidate resume text' };
    const encrypted = await encryptEnvelopeWithOverlays(
      data,
      resumeContext,
      [orgVaultRecipient(vault.publicKey, 1)],
      [processorRecipient('grant-1', processor.publicKey)],
    );

    expect(encrypted.envelope.keys.map((key) => key.recipient)).toEqual(['org_vault']);
    expect(encrypted.overlayKeys.map((key) => key.recipient)).toEqual(['processor:grant-1']);

    const mergedEnvelope: EncryptedEnvelope = {
      ...encrypted.envelope,
      keys: [...encrypted.envelope.keys, ...encrypted.overlayKeys],
    };
    const decrypted = await decryptEnvelope(mergedEnvelope, resumeContext, {
      recipient: 'processor:grant-1',
      privateKey: processor.privateKey,
    });

    expect(decrypted).toEqual(data);
  });

  it('rejects purpose mismatch before unwrapping keys', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);

    await expect(
      decryptEnvelope(
        envelope,
        { ...resumeContext, purpose: 'application_file' },
        {
          recipient: 'org_vault',
          privateKey: vault.privateKey,
        },
      ),
    ).rejects.toThrow('Envelope purpose mismatch: expected application_file, got encrypted_file');
  });

  it('rejects missing recipient keys', async () => {
    const vault = generateVaultKeyPair();
    const processor = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);

    await expect(
      decryptEnvelope(envelope, resumeContext, {
        recipient: 'processor:grant-1',
        privateKey: processor.privateKey,
      }),
    ).rejects.toThrow('Envelope key not found for recipient: processor:grant-1');
  });

  it('rejects empty and policy-invalid recipient sets', async () => {
    const vault = generateVaultKeyPair();

    await expect(encryptEnvelope({ ok: true }, resumeContext, [])).rejects.toThrow(
      'EncryptedEnvelope must include at least one recipient key',
    );
    await expect(
      encryptEnvelope({ ok: true }, resumeContext, [
        orgVaultRecipient(vault.publicKey, 1),
        applicantRecipient(TEST_KEYS.alice.publicKey),
      ]),
    ).rejects.toThrow('encrypted_file can only use org_vault and processor recipients');
  });

  it('rejects malformed overlay processor recipients at the crypto boundary', async () => {
    const vault = generateVaultKeyPair();
    const processor = generateVaultKeyPair();
    const malformedProcessor = {
      recipient: 'processor:grant:extra',
      publicKey: processor.publicKey,
    } as unknown as RecipientDescriptor;

    await expect(
      encryptEnvelopeWithOverlays(
        { ok: true },
        resumeContext,
        [orgVaultRecipient(vault.publicKey, 1)],
        [malformedProcessor],
      ),
    ).rejects.toThrow();
  });

  it('rejects a tampered kemCt (ML-KEM half) on a stored envelope key', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);
    const tampered: EncryptedEnvelope = {
      ...envelope,
      keys: envelope.keys.map((key) => ({ ...key, kemCt: tamperBase64(key.kemCt) })),
    };

    await expect(
      decryptEnvelope(tampered, resumeContext, { recipient: 'org_vault', privateKey: vault.privateKey }),
    ).rejects.toThrow();
  });

  it('rejects a tampered epk (X25519 half) on a stored envelope key', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);
    const tampered: EncryptedEnvelope = {
      ...envelope,
      keys: envelope.keys.map((key) => ({ ...key, epk: tamperHex(key.epk) })),
    };

    await expect(
      decryptEnvelope(tampered, resumeContext, { recipient: 'org_vault', privateKey: vault.privateKey }),
    ).rejects.toThrow();
  });

  it('rejects a tampered envelope iv', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);
    const tampered: EncryptedEnvelope = {
      ...envelope,
      iv: tamperBase64(envelope.iv),
    };

    await expect(
      decryptEnvelope(tampered, resumeContext, { recipient: 'org_vault', privateKey: vault.privateKey }),
    ).rejects.toThrow();
  });

  it('rejects unwrapping an org_vault key under a different recipient label (keyWrapAad mismatch)', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, emailContext, [
      orgVaultRecipient(vault.publicKey, 1),
      applicantRecipient(TEST_KEYS.alice.publicKey),
    ]);
    const orgVaultKey = envelope.keys.find((key) => key.recipient === 'org_vault');

    if (!orgVaultKey) {
      throw new Error('missing org_vault key');
    }

    const relabeled: EncryptedEnvelope = {
      ...envelope,
      keys: envelope.keys.map((key) => relabelApplicantKeyWithOrgVaultMaterial(key, orgVaultKey)),
    };

    await expect(
      decryptEnvelope(relabeled, emailContext, { recipient: 'applicant', privateKey: vault.privateKey }),
    ).rejects.toThrow();
  });

  it('rejects decrypting under a context with a different orgId/subjectId/fieldId (context AAD mismatch)', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ ok: true }, resumeContext, [orgVaultRecipient(vault.publicKey, 1)]);

    const wrongOrg: CryptoContextInput = { ...resumeContext, orgId: 'org-999' };
    const wrongSubject: CryptoContextInput = { ...resumeContext, subjectId: 'application-999' };
    const wrongField: CryptoContextInput = { ...resumeContext, fieldId: 'not-a-resume' };

    for (const wrongContext of [wrongOrg, wrongSubject, wrongField]) {
      await expect(
        decryptEnvelope(envelope, wrongContext, { recipient: 'org_vault', privateKey: vault.privateKey }),
      ).rejects.toThrow();
    }
  });
});

function orgVaultRecipients(vault: VaultKeyPair): RecipientDescriptor[] {
  return [orgVaultRecipient(vault.publicKey, 1)];
}

function decryptWithOrgVault(envelope: EncryptedEnvelope, context: CryptoContextInput, vault: VaultKeyPair) {
  return decryptEnvelope(envelope, context, {
    recipient: 'org_vault',
    privateKey: vault.privateKey,
  });
}

function compressibleCandidatePayload() {
  return {
    summary: repeatText('Senior engineer with privacy systems experience. ', 200),
    answers: Array.from({ length: 16 }, (_, index) => candidateAnswer(index)),
  };
}

function candidateAnswer(index: number) {
  return {
    question: `Question ${index}`,
    answer: repeatText('TypeScript, applied cryptography, distributed systems. ', 40),
  };
}

function compressibleMetadataPayload() {
  return {
    body: repeatText('compression metadata must be authenticated. ', 400),
  };
}

describe('recipient key version', () => {
  const profileContext: CryptoContextInput = {
    purpose: 'candidate_profile',
    orgId: 'org-1',
    subjectId: 'candidate-1',
    fieldId: 'profile',
  };

  it('stamps the org_vault key version into the envelope', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ email: 'a@b.co' }, profileContext, [
      orgVaultRecipient(vault.publicKey, 7),
    ]);
    const orgKey = envelope.keys.find((key) => key.recipient === 'org_vault');

    expect(orgKey?.rkv).toBe(7);
  });

  it('round-trips regardless of the stamped version', async () => {
    const vault = generateVaultKeyPair();
    const envelope = await encryptEnvelope({ email: 'a@b.co' }, profileContext, [
      orgVaultRecipient(vault.publicKey, 42),
    ]);
    const decrypted = await decryptEnvelope(envelope, profileContext, {
      recipient: 'org_vault',
      privateKey: vault.privateKey,
    });

    expect(decrypted).toEqual({ email: 'a@b.co' });
  });
});

function repeatText(text: string, times: number): string {
  return text.repeat(times);
}

function jsonByteLength(data: unknown): number {
  return textEncoder.encode(JSON.stringify(data)).length;
}

function relabelApplicantKeyWithOrgVaultMaterial(
  key: EncryptedEnvelope['keys'][number],
  orgVaultKey: EncryptedEnvelope['keys'][number],
): EncryptedEnvelope['keys'][number] {
  if (key.recipient !== 'applicant') {
    return key;
  }

  return {
    recipient: 'applicant',
    rkv: 1,
    ek: orgVaultKey.ek,
    epk: orgVaultKey.epk,
    kemCt: orgVaultKey.kemCt,
    iv: orgVaultKey.iv,
  };
}
