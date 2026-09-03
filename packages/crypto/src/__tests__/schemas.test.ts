import { base64 } from '@scure/base';
import { describe, expect, it } from 'vitest';
import { dataAad, keyWrapAad, serializeDataAadContext, serializeKeyWrapAadContext } from '../context';
import { wrappedKeySchema } from '../envelope-key';
import { wrappedPersonalKeySchema } from '../personal-key';
import { assertAllowedRecipients, getRecipientPolicyViolation } from '../recipient-policy';
import { isEnvelopeRecipient } from '../recipients';
import {
  base64BytesSchema,
  base64StringSchema,
  type EnvelopeKey,
  encryptedEnvelopeSchema,
  isEncryptedEnvelope,
  privateEncryptionKeySchema,
  publicEncryptionKeySchema,
  XWING_MLKEM_CIPHERTEXT_BYTES,
  XWING_PUBLIC_KEY_BYTES,
  XWING_SECRET_KEY_BYTES,
} from '../schemas';

const testPublicKey = 'a'.repeat(64);
const testIv = base64.encode(new Uint8Array(12));
const testCiphertext = base64.encode(new Uint8Array([1, 2, 3, 4]));
const testKemCt = base64.encode(new Uint8Array(XWING_MLKEM_CIPHERTEXT_BYTES));
const testXWingPublicKey = base64.encode(new Uint8Array(XWING_PUBLIC_KEY_BYTES));
const testXWingPrivateKey = base64.encode(new Uint8Array(XWING_SECRET_KEY_BYTES));

function envelopeKey(recipient: EnvelopeKey['recipient']): EnvelopeKey {
  return {
    recipient,
    rkv: 1,
    ek: testCiphertext,
    epk: testPublicKey,
    kemCt: testKemCt,
    iv: testIv,
  };
}

function encryptedEnvelope(overrides: Partial<Parameters<typeof encryptedEnvelopeSchema.parse>[0]> = {}) {
  return {
    v: 1,
    purpose: 'application_answers',
    zip: 'none',
    ct: testCiphertext,
    iv: testIv,
    keys: [envelopeKey('org_vault')],
    ...overrides,
  };
}

describe('crypto schemas', () => {
  it('accepts a valid dynamic encrypted envelope', () => {
    const result = encryptedEnvelopeSchema.safeParse(encryptedEnvelope());

    expect(result.success).toBe(true);
  });

  it('rejects unknown suite versions', () => {
    const result = encryptedEnvelopeSchema.safeParse(encryptedEnvelope({ v: 2 }));

    expect(result.success).toBe(false);
  });

  it('rejects duplicate recipients', () => {
    const result = encryptedEnvelopeSchema.safeParse(
      encryptedEnvelope({
        keys: [envelopeKey('org_vault'), envelopeKey('org_vault')],
      }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects recipients outside the purpose policy', () => {
    const result = encryptedEnvelopeSchema.safeParse(
      encryptedEnvelope({
        purpose: 'candidate_note',
        keys: [envelopeKey('org_vault'), envelopeKey('applicant')],
      }),
    );

    expect(result.success).toBe(false);
  });

  it('allows email content for org vault and applicant plus processor grant', () => {
    const result = encryptedEnvelopeSchema.safeParse(
      encryptedEnvelope({
        purpose: 'email_content',
        keys: [envelopeKey('org_vault'), envelopeKey('applicant'), envelopeKey('processor:grant-1')],
      }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects multiple processor recipients for one payload operation', () => {
    const result = encryptedEnvelopeSchema.safeParse(
      encryptedEnvelope({
        purpose: 'encrypted_file',
        keys: [envelopeKey('org_vault'), envelopeKey('processor:grant-1'), envelopeKey('processor:grant-2')],
      }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects invalid envelope shape through type guard', () => {
    expect(isEncryptedEnvelope(encryptedEnvelope())).toBe(true);
    expect(isEncryptedEnvelope(null)).toBe(false);
    expect(isEncryptedEnvelope({ ...encryptedEnvelope(), ct: 'not-base64' })).toBe(false);
  });

  it('rejects non-canonical base64 values', () => {
    expect(base64StringSchema.safeParse('AQ==').success).toBe(true);
    expect(base64StringSchema.safeParse('AAAA=').success).toBe(false);
    expect(base64StringSchema.safeParse('not-base64').success).toBe(false);
  });

  it('validates fixed-length base64 byte strings', () => {
    const schema = base64BytesSchema(2, 'Expected 2 bytes');

    expect(schema.safeParse(base64.encode(new Uint8Array([1, 2]))).success).toBe(true);
    expect(schema.safeParse(base64.encode(new Uint8Array([1, 2, 3]))).success).toBe(false);
    expect(schema.safeParse('not-base64').success).toBe(false);
  });

  it('accepts only current recipient identifiers', () => {
    expect(isEnvelopeRecipient('org_vault')).toBe(true);
    expect(isEnvelopeRecipient('applicant')).toBe(true);
    expect(isEnvelopeRecipient('processor:grant-1')).toBe(true);
    expect(isEnvelopeRecipient('processor:grant:extra')).toBe(false);
    expect(isEnvelopeRecipient('member:1')).toBe(false);
    expect(isEnvelopeRecipient(123)).toBe(false);
  });

  it('validates reusable wrapped keys with canonical crypto fields', () => {
    const wrappedKey = {
      v: 1,
      ek: testCiphertext,
      epk: testPublicKey,
      kemCt: testKemCt,
      iv: testIv,
    };

    expect(wrappedKeySchema.safeParse(wrappedKey).success).toBe(true);
    expect(wrappedKeySchema.safeParse({ ...wrappedKey, ek: 'not-base64' }).success).toBe(false);
    expect(wrappedKeySchema.safeParse({ ...wrappedKey, iv: base64.encode(new Uint8Array(8)) }).success).toBe(false);
    expect(wrappedKeySchema.safeParse({ ...wrappedKey, epk: 'abc' }).success).toBe(false);
    expect(wrappedKeySchema.safeParse({ ...wrappedKey, kemCt: testCiphertext }).success).toBe(false);
    expect(wrappedKeySchema.safeParse({ ...wrappedKey, extra: true }).success).toBe(false);
  });

  it('requires signature+share personal-key wrappers', () => {
    const walletWrapper = {
      method: 'wallet_signature',
      kdf: 'signature+share',
      id: 'evm:0x1111111111111111111111111111111111111111',
      ek: testCiphertext,
      iv: testIv,
      salt: base64.encode(new Uint8Array(32)),
    };
    const wrappedPersonalKey = {
      v: 1,
      pk: { ek: testCiphertext, iv: testIv },
      wraps: [walletWrapper],
    };

    expect(wrappedPersonalKeySchema.safeParse(wrappedPersonalKey).success).toBe(true);
    expect(
      wrappedPersonalKeySchema.safeParse({
        ...wrappedPersonalKey,
        wraps: [{ ...walletWrapper, kdf: 'signature' }],
      }).success,
    ).toBe(false);
    expect(
      wrappedPersonalKeySchema.safeParse({
        ...wrappedPersonalKey,
        wraps: [{ ...walletWrapper, kdf: undefined }],
      }).success,
    ).toBe(false);
  });

  it('validates post-quantum public key bundles', () => {
    const publicKey = {
      v: 1,
      xwing: testXWingPublicKey,
    };

    expect(publicEncryptionKeySchema.safeParse(publicKey).success).toBe(true);
    expect(publicEncryptionKeySchema.safeParse({ ...publicKey, v: 2 }).success).toBe(false);
    expect(publicEncryptionKeySchema.safeParse({ ...publicKey, xwing: testPublicKey }).success).toBe(false);
    expect(publicEncryptionKeySchema.safeParse({ ...publicKey, extra: true }).success).toBe(false);
  });

  it('validates post-quantum private key bundles', () => {
    const privateKey = {
      v: 1,
      xwing: testXWingPrivateKey,
    };

    expect(privateEncryptionKeySchema.safeParse(privateKey).success).toBe(true);
    expect(privateEncryptionKeySchema.safeParse({ ...privateKey, v: 2 }).success).toBe(false);
    expect(privateEncryptionKeySchema.safeParse({ ...privateKey, xwing: testXWingPublicKey }).success).toBe(false);
    expect(privateEncryptionKeySchema.safeParse({ ...privateKey, extra: true }).success).toBe(false);
  });
});

describe('recipient policy', () => {
  it('returns null for valid recipient sets', () => {
    const violation = getRecipientPolicyViolation('encrypted_file', ['org_vault', 'processor:grant-1']);

    expect(violation).toBeNull();
  });

  it('throws for standalone crypto purposes used as envelopes', () => {
    expect(() => assertAllowedRecipients('personal_key', ['org_vault'])).toThrow(
      'personal_key is not an EncryptedEnvelope purpose',
    );
  });
});

describe('crypto context AAD', () => {
  it('serializes data AAD with stable null fields', () => {
    const context = {
      purpose: 'application_answers' as const,
      orgId: 'org-1',
      subjectId: 'application-1',
    };

    expect(serializeDataAadContext(context)).toBe(
      '{"v":1,"purpose":"application_answers","orgId":"org-1","subjectId":"application-1","fieldId":null,"zip":"none"}',
    );
    expect(serializeDataAadContext(context, 1, { zip: 'none' })).toBe(serializeDataAadContext(context));
    expect(serializeDataAadContext(context, 1, { zip: 'gzip' })).toBe(
      '{"v":1,"purpose":"application_answers","orgId":"org-1","subjectId":"application-1","fieldId":null,"zip":"gzip"}',
    );
    expect(new TextDecoder().decode(dataAad(context))).toBe(serializeDataAadContext(context));
  });

  it('binds key-wrap AAD to the concrete recipient', () => {
    const context = {
      purpose: 'email_content' as const,
      orgId: 'org-1',
      subjectId: 'email-1',
    };

    expect(serializeKeyWrapAadContext(context, 'org_vault')).toBe(
      '{"v":1,"purpose":"email_content","orgId":"org-1","subjectId":"email-1","fieldId":null,"recipient":"org_vault"}',
    );
    expect(new TextDecoder().decode(keyWrapAad(context, 'applicant'))).toBe(
      serializeKeyWrapAadContext(context, 'applicant'),
    );
    expect(serializeKeyWrapAadContext(context, 'org_vault')).not.toBe(serializeKeyWrapAadContext(context, 'applicant'));
  });
});
