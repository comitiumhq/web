import type { CryptoPurpose } from './context';
import { type EnvelopeRecipient, isProcessorRecipient } from './recipients';

const ORG_VAULT_ONLY_PURPOSES = new Set<CryptoPurpose>([
  'candidate_profile',
  'candidate_note',
  'candidate_tag',
  'custom_field_value',
  'feedback_answers',
  'criterion_evidence',
]);

const STANDALONE_CRYPTO_PURPOSES = new Set<CryptoPurpose>(['personal_key', 'org_vault_key', 'identity_hash']);

/**
 * Default-deny allowlist: why `recipients` are rejected for `purpose`, or `null`.
 * Unmatched purpose = reject; add a branch per new `CryptoPurpose`, never default-allow.
 */
export function getRecipientPolicyViolation(
  purpose: CryptoPurpose,
  recipients: readonly EnvelopeRecipient[],
): string | null {
  if (recipients.length === 0) {
    return 'EncryptedEnvelope must include at least one recipient key';
  }

  const duplicateRecipient = findDuplicateRecipient(recipients);

  if (duplicateRecipient !== null) {
    return `Duplicate encrypted-envelope recipient: ${duplicateRecipient}`;
  }

  if (ORG_VAULT_ONLY_PURPOSES.has(purpose)) {
    return validateExactOrgVaultRecipient(purpose, recipients);
  }

  if (purpose === 'application_answers' || purpose === 'application_file') {
    return validateOrgVaultWithOptionalApplicant(purpose, recipients);
  }

  if (purpose === 'encrypted_file' || purpose === 'candidate_identity_input' || purpose === 'candidate_profile_input') {
    return validateProcessorOverlayRecipients(purpose, recipients);
  }

  if (purpose === 'email_content') {
    return validateEmailContentRecipients(recipients);
  }

  if (STANDALONE_CRYPTO_PURPOSES.has(purpose)) {
    return `${purpose} is not an EncryptedEnvelope purpose`;
  }

  return `Unsupported encrypted-envelope purpose: ${purpose}`;
}

export function assertAllowedRecipients(purpose: CryptoPurpose, recipients: readonly EnvelopeRecipient[]): void {
  const violation = getRecipientPolicyViolation(purpose, recipients);

  if (violation !== null) {
    throw new Error(violation);
  }
}

function findDuplicateRecipient(recipients: readonly EnvelopeRecipient[]): EnvelopeRecipient | null {
  const seen = new Set<EnvelopeRecipient>();

  for (const recipient of recipients) {
    if (seen.has(recipient)) {
      return recipient;
    }

    seen.add(recipient);
  }

  return null;
}

function validateExactOrgVaultRecipient(
  purpose: CryptoPurpose,
  recipients: readonly EnvelopeRecipient[],
): string | null {
  if (recipients.length === 1 && recipients[0] === 'org_vault') {
    return null;
  }

  return `${purpose} must be encrypted only for org_vault`;
}

function validateOrgVaultWithOptionalApplicant(
  purpose: CryptoPurpose,
  recipients: readonly EnvelopeRecipient[],
): string | null {
  if (!recipients.includes('org_vault')) {
    return `${purpose} must include org_vault recipient`;
  }

  const hasOnlyAllowedRecipients = recipients.every(
    (recipient) => recipient === 'org_vault' || recipient === 'applicant',
  );

  if (!hasOnlyAllowedRecipients) {
    return `${purpose} can only use org_vault and optional applicant recipients`;
  }

  return null;
}

function validateProcessorOverlayRecipients(
  purpose: 'candidate_identity_input' | 'candidate_profile_input' | 'encrypted_file',
  recipients: readonly EnvelopeRecipient[],
): string | null {
  if (!recipients.includes('org_vault')) {
    return `${purpose} must include org_vault recipient`;
  }

  if (countProcessorRecipients(recipients) > 1) {
    return `${purpose} can include at most one processor recipient`;
  }

  const hasOnlyAllowedRecipients = recipients.every(
    (recipient) => recipient === 'org_vault' || isProcessorRecipient(recipient),
  );

  if (!hasOnlyAllowedRecipients) {
    return `${purpose} can only use org_vault and processor recipients`;
  }

  return null;
}

function validateEmailContentRecipients(recipients: readonly EnvelopeRecipient[]): string | null {
  if (!recipients.includes('org_vault')) {
    return 'email_content must include org_vault recipient';
  }

  if (!recipients.includes('applicant')) {
    return 'email_content must include applicant recipient';
  }

  if (countProcessorRecipients(recipients) > 1) {
    return 'email_content can include at most one processor recipient';
  }

  const hasOnlyAllowedRecipients = recipients.every(
    (recipient) => recipient === 'org_vault' || recipient === 'applicant' || isProcessorRecipient(recipient),
  );

  if (!hasOnlyAllowedRecipients) {
    return 'email_content can only use org_vault, applicant, and processor recipients';
  }

  return null;
}

function countProcessorRecipients(recipients: readonly EnvelopeRecipient[]): number {
  return recipients.filter(isProcessorRecipient).length;
}
