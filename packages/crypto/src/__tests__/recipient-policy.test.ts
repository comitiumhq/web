import { describe, expect, it } from 'vitest';

import type { CryptoPurpose } from '../context';
import { assertAllowedRecipients, getRecipientPolicyViolation } from '../recipient-policy';
import type { EnvelopeRecipient } from '../recipients';

describe('recipient policy', () => {
  const validCases: Array<{ purpose: CryptoPurpose; recipients: EnvelopeRecipient[] }> = [
    { purpose: 'application_answers', recipients: ['org_vault'] },
    { purpose: 'application_answers', recipients: ['org_vault', 'applicant'] },
    { purpose: 'application_file', recipients: ['org_vault'] },
    { purpose: 'application_file', recipients: ['org_vault', 'applicant'] },
    { purpose: 'encrypted_file', recipients: ['org_vault'] },
    { purpose: 'encrypted_file', recipients: ['org_vault', 'processor:grant-1'] },
    { purpose: 'candidate_identity_input', recipients: ['org_vault', 'processor:grant-1'] },
    { purpose: 'candidate_profile_input', recipients: ['org_vault', 'processor:grant-1'] },
    { purpose: 'candidate_profile', recipients: ['org_vault'] },
    { purpose: 'candidate_note', recipients: ['org_vault'] },
    { purpose: 'candidate_tag', recipients: ['org_vault'] },
    { purpose: 'custom_field_value', recipients: ['org_vault'] },
    { purpose: 'feedback_answers', recipients: ['org_vault'] },
    { purpose: 'criterion_evidence', recipients: ['org_vault'] },
    { purpose: 'email_content', recipients: ['org_vault', 'applicant'] },
    { purpose: 'email_content', recipients: ['org_vault', 'applicant', 'processor:grant-1'] },
  ];

  it.each(validCases)('allows $purpose for $recipients', ({ purpose, recipients }) => {
    expect(getRecipientPolicyViolation(purpose, recipients)).toBeNull();
    expect(() => assertAllowedRecipients(purpose, recipients)).not.toThrow();
  });

  const invalidCases: Array<{ purpose: CryptoPurpose; recipients: EnvelopeRecipient[]; violation: string }> = [
    {
      purpose: 'application_answers',
      recipients: [],
      violation: 'EncryptedEnvelope must include at least one recipient key',
    },
    {
      purpose: 'application_answers',
      recipients: ['org_vault', 'org_vault'],
      violation: 'Duplicate encrypted-envelope recipient: org_vault',
    },
    {
      purpose: 'application_answers',
      recipients: ['applicant'],
      violation: 'application_answers must include org_vault recipient',
    },
    {
      purpose: 'application_file',
      recipients: ['org_vault', 'processor:grant-1'],
      violation: 'application_file can only use org_vault and optional applicant recipients',
    },
    {
      purpose: 'encrypted_file',
      recipients: ['processor:grant-1'],
      violation: 'encrypted_file must include org_vault recipient',
    },
    {
      purpose: 'candidate_identity_input',
      recipients: ['org_vault', 'applicant'],
      violation: 'candidate_identity_input can only use org_vault and processor recipients',
    },
    {
      purpose: 'candidate_profile_input',
      recipients: ['org_vault', 'applicant'],
      violation: 'candidate_profile_input can only use org_vault and processor recipients',
    },
    {
      purpose: 'encrypted_file',
      recipients: ['org_vault', 'applicant'],
      violation: 'encrypted_file can only use org_vault and processor recipients',
    },
    {
      purpose: 'encrypted_file',
      recipients: ['org_vault', 'processor:grant-1', 'processor:grant-2'],
      violation: 'encrypted_file can include at most one processor recipient',
    },
    {
      purpose: 'candidate_profile',
      recipients: ['org_vault', 'applicant'],
      violation: 'candidate_profile must be encrypted only for org_vault',
    },
    {
      purpose: 'candidate_note',
      recipients: ['org_vault', 'applicant'],
      violation: 'candidate_note must be encrypted only for org_vault',
    },
    {
      purpose: 'candidate_tag',
      recipients: ['org_vault', 'applicant'],
      violation: 'candidate_tag must be encrypted only for org_vault',
    },
    {
      purpose: 'custom_field_value',
      recipients: ['org_vault', 'applicant'],
      violation: 'custom_field_value must be encrypted only for org_vault',
    },
    {
      purpose: 'feedback_answers',
      recipients: ['org_vault', 'applicant'],
      violation: 'feedback_answers must be encrypted only for org_vault',
    },
    {
      purpose: 'criterion_evidence',
      recipients: ['org_vault', 'applicant'],
      violation: 'criterion_evidence must be encrypted only for org_vault',
    },
    {
      purpose: 'email_content',
      recipients: ['applicant'],
      violation: 'email_content must include org_vault recipient',
    },
    {
      purpose: 'email_content',
      recipients: ['org_vault'],
      violation: 'email_content must include applicant recipient',
    },
    {
      purpose: 'email_content',
      recipients: ['org_vault', 'applicant', 'processor:grant-1', 'processor:grant-2'],
      violation: 'email_content can include at most one processor recipient',
    },
    {
      purpose: 'email_content',
      recipients: ['org_vault', 'applicant', 'member:1' as EnvelopeRecipient],
      violation: 'email_content can only use org_vault, applicant, and processor recipients',
    },
    {
      purpose: 'personal_key',
      recipients: ['org_vault'],
      violation: 'personal_key is not an EncryptedEnvelope purpose',
    },
    {
      purpose: 'org_vault_key',
      recipients: ['org_vault'],
      violation: 'org_vault_key is not an EncryptedEnvelope purpose',
    },
    {
      purpose: 'identity_hash',
      recipients: ['org_vault'],
      violation: 'identity_hash is not an EncryptedEnvelope purpose',
    },
  ];

  it.each(invalidCases)('rejects $purpose for $recipients', ({ purpose, recipients, violation }) => {
    expect(getRecipientPolicyViolation(purpose, recipients)).toBe(violation);
    expect(() => assertAllowedRecipients(purpose, recipients)).toThrow(violation);
  });

  it('rejects unsupported envelope purposes defensively', () => {
    expect(getRecipientPolicyViolation('unknown' as CryptoPurpose, ['org_vault'])).toBe(
      'Unsupported encrypted-envelope purpose: unknown',
    );
  });
});
