import { PROCESSOR_RECIPIENT_REGEX } from './patterns';
import type { PublicEncryptionKey } from './schemas';
import { type EnvelopeRecipient, isEnvelopeRecipient } from './schemas/recipients';

export type { EnvelopeRecipient } from './schemas/recipients';
export { envelopeRecipientSchema, isEnvelopeRecipient } from './schemas/recipients';

const DEFAULT_KEY_VERSION = 1;

export type RecipientDescriptor = {
  recipient: EnvelopeRecipient;
  publicKey: PublicEncryptionKey;
  keyVersion: number;
};

export function orgVaultRecipient(publicKey: PublicEncryptionKey, keyVersion: number): RecipientDescriptor {
  return { recipient: 'org_vault', publicKey, keyVersion };
}

export function applicantRecipient(publicKey: PublicEncryptionKey, keyVersion: number): RecipientDescriptor {
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
