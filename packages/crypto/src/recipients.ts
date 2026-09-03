import { z } from 'zod';

import type { PublicEncryptionKey } from './schemas';

const PROCESSOR_RECIPIENT_REGEX = /^processor:[^\s:]+$/;

const STATIC_ENVELOPE_RECIPIENTS = ['org_vault', 'applicant'] as const;
const DYNAMIC_ENVELOPE_RECIPIENT_PREFIXES = ['processor'] as const;

type StaticEnvelopeRecipient = (typeof STATIC_ENVELOPE_RECIPIENTS)[number];
type DynamicEnvelopeRecipientPrefix = (typeof DYNAMIC_ENVELOPE_RECIPIENT_PREFIXES)[number];
type DynamicEnvelopeRecipient = `${DynamicEnvelopeRecipientPrefix}:${string}`;
export type EnvelopeRecipient = StaticEnvelopeRecipient | DynamicEnvelopeRecipient;

const DEFAULT_KEY_VERSION = 1;

export type RecipientDescriptor = {
  recipient: EnvelopeRecipient;
  publicKey: PublicEncryptionKey;
  keyVersion: number;
};

export function isEnvelopeRecipient(value: unknown): value is EnvelopeRecipient {
  if (value === 'org_vault' || value === 'applicant') {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return PROCESSOR_RECIPIENT_REGEX.test(value);
}

export const envelopeRecipientSchema = z.custom<EnvelopeRecipient>(
  isEnvelopeRecipient,
  'Invalid encrypted-envelope recipient',
);

export function orgVaultRecipient(publicKey: PublicEncryptionKey, keyVersion: number): RecipientDescriptor {
  return { recipient: 'org_vault', publicKey, keyVersion };
}

export function applicantRecipient(
  publicKey: PublicEncryptionKey,
  keyVersion: number = DEFAULT_KEY_VERSION,
): RecipientDescriptor {
  return { recipient: 'applicant', publicKey, keyVersion };
}

export function processorRecipient(
  grantId: string,
  publicKey: PublicEncryptionKey,
  keyVersion: number = DEFAULT_KEY_VERSION,
): RecipientDescriptor {
  const recipient = `processor:${grantId}`;

  if (!isEnvelopeRecipient(recipient)) {
    throw new Error('Invalid processor recipient');
  }

  return { recipient, publicKey, keyVersion };
}

export function isProcessorRecipient(recipient: EnvelopeRecipient): recipient is `processor:${string}` {
  return PROCESSOR_RECIPIENT_REGEX.test(recipient);
}
