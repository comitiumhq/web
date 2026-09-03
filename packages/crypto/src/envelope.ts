import { randomBytes } from '@noble/hashes/utils.js';

import { type CryptoContextInput, type CryptoPurpose, dataAad, keyWrapAad } from './context';
import { decryptData, encryptPayloadBytes } from './data-encryption';
import { envelopeKeyToWrappedKey, unwrapDek, wrapRecipientKey } from './envelope-key';
import { prepareJsonPayload } from './payload-compression';
import { assertAllowedRecipients } from './recipient-policy';
import type { EnvelopeRecipient, RecipientDescriptor } from './recipients';
import { type EncryptedEnvelope, type EnvelopeKey, encryptedEnvelopeSchema } from './schemas';
import { ALGORITHM_SUITE_VERSION } from './version';

export type DecryptEnvelopeRecipient = {
  recipient: EnvelopeRecipient;
  privateKey: Uint8Array;
};

export type EncryptedEnvelopeWithOverlays = {
  envelope: EncryptedEnvelope;
  overlayKeys: EnvelopeKey[];
};

const COMPRESSIBLE_ENVELOPE_PURPOSES = new Set<CryptoPurpose>([
  'application_answers',
  'candidate_profile',
  'candidate_note',
  'candidate_tag',
  'custom_field_value',
  'feedback_answers',
  'criterion_evidence',
  'email_content',
]);

export async function encryptEnvelope(
  data: unknown,
  context: CryptoContextInput,
  recipients: readonly RecipientDescriptor[],
): Promise<EncryptedEnvelope> {
  assertAllowedRecipients(
    context.purpose,
    recipients.map((recipient) => recipient.recipient),
  );

  const dek = randomBytes(32);

  try {
    const payload = await prepareJsonPayload(data, COMPRESSIBLE_ENVELOPE_PURPOSES.has(context.purpose));
    const encrypted = await encryptPayloadBytes(
      payload.bytes,
      dek,
      dataAad(context, ALGORITHM_SUITE_VERSION, { zip: payload.zip }),
    );

    const keys = await Promise.all(recipients.map((recipient) => wrapRecipientKey(dek, context, recipient)));

    return encryptedEnvelopeSchema.parse({
      v: ALGORITHM_SUITE_VERSION,
      purpose: context.purpose,
      zip: payload.zip,
      ct: encrypted.ct,
      iv: encrypted.iv,
      keys,
    });
  } finally {
    dek.fill(0);
  }
}

export async function encryptEnvelopeWithOverlays(
  data: unknown,
  context: CryptoContextInput,
  storedRecipients: readonly RecipientDescriptor[],
  overlayRecipients: readonly RecipientDescriptor[],
): Promise<EncryptedEnvelopeWithOverlays> {
  const recipients = [...storedRecipients, ...overlayRecipients];

  assertAllowedRecipients(
    context.purpose,
    recipients.map((recipient) => recipient.recipient),
  );

  const dek = randomBytes(32);

  try {
    const payload = await prepareJsonPayload(data, COMPRESSIBLE_ENVELOPE_PURPOSES.has(context.purpose));

    const encrypted = await encryptPayloadBytes(
      payload.bytes,
      dek,
      dataAad(context, ALGORITHM_SUITE_VERSION, { zip: payload.zip }),
    );

    const [storedKeys, overlayKeys] = await Promise.all([
      wrapEnvelopeKeys(dek, context, storedRecipients),
      wrapEnvelopeKeys(dek, context, overlayRecipients),
    ]);

    return {
      envelope: encryptedEnvelopeSchema.parse({
        v: ALGORITHM_SUITE_VERSION,
        purpose: context.purpose,
        zip: payload.zip,
        ct: encrypted.ct,
        iv: encrypted.iv,
        keys: storedKeys,
      }),
      overlayKeys,
    };
  } finally {
    dek.fill(0);
  }
}

export async function decryptEnvelope<T = unknown>(
  envelope: EncryptedEnvelope,
  context: CryptoContextInput,
  recipient: DecryptEnvelopeRecipient,
): Promise<T> {
  const parsed = encryptedEnvelopeSchema.parse(envelope);

  if (parsed.purpose !== context.purpose) {
    throw new Error(`Envelope purpose mismatch: expected ${context.purpose}, got ${parsed.purpose}`);
  }

  const key = parsed.keys.find((candidate) => candidate.recipient === recipient.recipient);

  if (!key) {
    throw new Error(`Envelope key not found for recipient: ${recipient.recipient}`);
  }

  const dek = await unwrapDek(
    envelopeKeyToWrappedKey(key),
    recipient.privateKey,
    keyWrapAad(context, recipient.recipient),
  );

  try {
    return await decryptData<T>(
      parsed.ct,
      parsed.iv,
      dek,
      dataAad(context, ALGORITHM_SUITE_VERSION, { zip: parsed.zip }),
      parsed.zip,
    );
  } finally {
    dek.fill(0);
  }
}

function wrapEnvelopeKeys(
  dek: Uint8Array,
  context: CryptoContextInput,
  recipients: readonly RecipientDescriptor[],
): Promise<EnvelopeKey[]> {
  return Promise.all(recipients.map((recipient) => wrapRecipientKey(dek, context, recipient)));
}
