import { z } from 'zod';

import type { PayloadCompression } from './payload-compression';
import type { EnvelopeRecipient } from './recipients';
import { ALGORITHM_SUITE_VERSION, type AlgorithmSuiteVersion } from './version';

const textEncoder = new TextEncoder();

const CRYPTO_PURPOSES = [
  'personal_key',
  'org_vault_key',
  'application_answers',
  'candidate_identity_input',
  'candidate_profile_input',
  'application_file',
  'encrypted_file',
  'candidate_profile',
  'candidate_note',
  'candidate_tag',
  'custom_field_value',
  'feedback_answers',
  'criterion_evidence',
  'email_content',
  'identity_hash',
] as const;

export type CryptoPurpose = (typeof CRYPTO_PURPOSES)[number];

export type CryptoContext = {
  purpose: CryptoPurpose;
  orgId: string | null;
  subjectId: string | null;
  fieldId: string | null;
};

export type CryptoContextInput = {
  purpose: CryptoPurpose;
  orgId?: string | null;
  subjectId?: string | null;
  fieldId?: string | null;
};

export type DataAadOptions = {
  zip?: PayloadCompression;
};

const nullableContextIdSchema = z.string().min(1).nullable().optional();

export const cryptoPurposeSchema = z.enum(CRYPTO_PURPOSES);

const cryptoContextInputSchema = z
  .object({
    purpose: cryptoPurposeSchema,
    orgId: nullableContextIdSchema,
    subjectId: nullableContextIdSchema,
    fieldId: nullableContextIdSchema,
  })
  .strict();

export function normalizeCryptoContext(context: CryptoContextInput): CryptoContext {
  const parsed = cryptoContextInputSchema.parse(context);

  return {
    purpose: parsed.purpose,
    orgId: parsed.orgId ?? null,
    subjectId: parsed.subjectId ?? null,
    fieldId: parsed.fieldId ?? null,
  };
}

export function serializeDataAadContext(
  context: CryptoContextInput,
  version: AlgorithmSuiteVersion = ALGORITHM_SUITE_VERSION,
  options: DataAadOptions = {},
): string {
  const normalized = normalizeCryptoContext(context);
  const aad = {
    v: version,
    purpose: normalized.purpose,
    orgId: normalized.orgId,
    subjectId: normalized.subjectId,
    fieldId: normalized.fieldId,
    zip: options.zip ?? 'none',
  };

  return JSON.stringify(aad);
}

export function serializeKeyWrapAadContext(
  context: CryptoContextInput,
  recipient: EnvelopeRecipient,
  version: AlgorithmSuiteVersion = ALGORITHM_SUITE_VERSION,
): string {
  const normalized = normalizeCryptoContext(context);

  return JSON.stringify({
    v: version,
    purpose: normalized.purpose,
    orgId: normalized.orgId,
    subjectId: normalized.subjectId,
    fieldId: normalized.fieldId,
    recipient,
  });
}

export function dataAad(
  context: CryptoContextInput,
  version: AlgorithmSuiteVersion = ALGORITHM_SUITE_VERSION,
  options: DataAadOptions = {},
): Uint8Array {
  return textEncoder.encode(serializeDataAadContext(context, version, options));
}

export function keyWrapAad(
  context: CryptoContextInput,
  recipient: EnvelopeRecipient,
  version: AlgorithmSuiteVersion = ALGORITHM_SUITE_VERSION,
): Uint8Array {
  return textEncoder.encode(serializeKeyWrapAadContext(context, recipient, version));
}

export function applicationAnswerBucketContext(orgId: string, formId: string, visibility: string): CryptoContextInput {
  return {
    purpose: 'application_answers',
    orgId,
    subjectId: formId,
    fieldId: `answers:${visibility}`,
  };
}

export function candidateIdentityInputContext(
  orgId: string,
  applicationId: string,
  questionId: string,
): CryptoContextInput {
  return {
    purpose: 'candidate_identity_input',
    orgId,
    subjectId: applicationId,
    fieldId: questionId,
  };
}

export function candidateProfileInputContext(orgId: string, applicationId: string): CryptoContextInput {
  return {
    purpose: 'candidate_profile_input',
    orgId,
    subjectId: applicationId,
    fieldId: 'profile',
  };
}

export function feedbackAnswerBucketContext(
  orgId: string,
  applicationId: string,
  formId: string,
  visibility: string,
): CryptoContextInput {
  return {
    purpose: 'feedback_answers',
    orgId,
    subjectId: applicationId,
    fieldId: `form:${formId}:${visibility}`,
  };
}

export function encryptedFileContext(orgId: string, fileId: string, kind: string): CryptoContextInput {
  return {
    purpose: 'encrypted_file',
    orgId,
    subjectId: fileId,
    fieldId: kind,
  };
}

export function encryptedFileMetadataContext(orgId: string, fileId: string, kind: string): CryptoContextInput {
  return {
    purpose: 'encrypted_file',
    orgId,
    subjectId: fileId,
    fieldId: `metadata:${kind}`,
  };
}

export function candidateProfileContext(orgId: string, candidateId: string): CryptoContextInput {
  return {
    purpose: 'candidate_profile',
    orgId,
    subjectId: candidateId,
    fieldId: 'profile',
  };
}

export function criterionEvidenceContext(
  orgId: string,
  applicationId: string,
  criterionId: string,
): CryptoContextInput {
  return {
    purpose: 'criterion_evidence',
    orgId,
    subjectId: applicationId,
    fieldId: criterionId,
  };
}

export function candidateNoteContext(orgId: string, candidateId: string): CryptoContextInput {
  return {
    purpose: 'candidate_note',
    orgId,
    subjectId: candidateId,
    fieldId: 'note',
  };
}

export function candidateTagContext(orgId: string): CryptoContextInput {
  return {
    purpose: 'candidate_tag',
    orgId,
    subjectId: orgId,
    fieldId: 'label',
  };
}

export function customFieldValueContext(orgId: string, candidateId: string, fieldId: string): CryptoContextInput {
  return {
    purpose: 'custom_field_value',
    orgId,
    subjectId: candidateId,
    fieldId,
  };
}

export function emailContentContext(orgId: string, applicationId: string): CryptoContextInput {
  return {
    purpose: 'email_content',
    orgId,
    subjectId: applicationId,
    fieldId: 'content',
  };
}
