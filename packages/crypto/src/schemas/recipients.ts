import { z } from 'zod';
import { PROCESSOR_RECIPIENT_REGEX } from '../patterns';

const STATIC_ENVELOPE_RECIPIENTS = ['org_vault', 'applicant'] as const;
const DYNAMIC_ENVELOPE_RECIPIENT_PREFIXES = ['processor'] as const;
const staticEnvelopeRecipients = new Set<string>(STATIC_ENVELOPE_RECIPIENTS);
const stringSchema = z.string();

type StaticEnvelopeRecipient = (typeof STATIC_ENVELOPE_RECIPIENTS)[number];
type DynamicEnvelopeRecipientPrefix = (typeof DYNAMIC_ENVELOPE_RECIPIENT_PREFIXES)[number];
type DynamicEnvelopeRecipient = `${DynamicEnvelopeRecipientPrefix}:${string}`;

export type EnvelopeRecipient = StaticEnvelopeRecipient | DynamicEnvelopeRecipient;

export function isEnvelopeRecipient(value: unknown): value is EnvelopeRecipient {
  const recipient = stringSchema.safeParse(value);

  if (!recipient.success) {
    return false;
  }

  return staticEnvelopeRecipients.has(recipient.data) || PROCESSOR_RECIPIENT_REGEX.test(recipient.data);
}

export const envelopeRecipientSchema = z.custom<EnvelopeRecipient>(
  isEnvelopeRecipient,
  'Invalid encrypted-envelope recipient',
);
