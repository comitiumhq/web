import { z } from 'zod';
import type { PayloadCompression } from '../payload-compression';

const CRYPTO_PURPOSES = [
  'personal_key',
  'org_vault_key',
  'application_answers',
  'candidate_identity_input',
  'candidate_profile_input',
  'application_file',
  'encrypted_file',
  'candidate_profile',
  'candidate_profile_enrichment',
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

export const cryptoContextInputSchema = z
  .object({
    purpose: cryptoPurposeSchema,
    orgId: nullableContextIdSchema,
    subjectId: nullableContextIdSchema,
    fieldId: nullableContextIdSchema,
  })
  .strict();
