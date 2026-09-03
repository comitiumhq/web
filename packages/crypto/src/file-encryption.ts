import { randomBytes } from '@noble/hashes/utils.js';
import { z } from 'zod';
import { type CryptoContextInput, cryptoPurposeSchema, dataAad, keyWrapAad } from './context';
import { decryptBinaryData, encryptBinaryData } from './data-encryption';
import { envelopeKeyToWrappedKey, unwrapDek, wrapRecipientKey } from './envelope-key';
import { assertAllowedRecipients } from './recipient-policy';
import { orgVaultRecipient, type RecipientDescriptor } from './recipients';
import {
  aesGcmIvSchema,
  algorithmSuiteVersionSchema,
  type EnvelopeKey,
  envelopeKeySchema,
  type PublicEncryptionKey,
} from './schemas';
import { ALGORITHM_SUITE_VERSION } from './version';

/**
 * Blob format: [4 bytes metadata length (uint32 BE)] [metadata JSON] [ciphertext]
 */
const HEADER_SIZE = 4;

const encryptedFileMetadataSchema = z
  .object({
    v: algorithmSuiteVersionSchema,
    purpose: cryptoPurposeSchema,
    iv: aesGcmIvSchema,
    keys: z.array(envelopeKeySchema).min(1),
    originalSize: z.number().int().min(0),
  })
  .strict();

type EncryptedFileMetadata = z.infer<typeof encryptedFileMetadataSchema>;

export type EncryptedFileWithOverlays = {
  blob: Uint8Array;
  overlayKeys: EnvelopeKey[];
};

function packEncryptedBlob(metadata: EncryptedFileMetadata, ciphertext: Uint8Array): Uint8Array {
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  const result = new Uint8Array(HEADER_SIZE + metadataBytes.length + ciphertext.length);
  const view = new DataView(result.buffer);

  view.setUint32(0, metadataBytes.length, false);
  result.set(metadataBytes, HEADER_SIZE);
  result.set(ciphertext, HEADER_SIZE + metadataBytes.length);

  return result;
}

function unpackEncryptedBlob(blob: Uint8Array): { metadata: EncryptedFileMetadata; ciphertext: Uint8Array } {
  if (blob.length < HEADER_SIZE) {
    throw new Error('Invalid encrypted blob: too short');
  }

  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const metadataLength = view.getUint32(0, false);

  if (blob.length < HEADER_SIZE + metadataLength) {
    throw new Error('Invalid encrypted blob: metadata length exceeds blob size');
  }

  const metadataBytes = blob.slice(HEADER_SIZE, HEADER_SIZE + metadataLength);
  const metadata = encryptedFileMetadataSchema.parse(JSON.parse(new TextDecoder().decode(metadataBytes)));
  const ciphertext = blob.slice(HEADER_SIZE + metadataLength);

  return { metadata, ciphertext };
}

/**
 * Encrypt file bytes into a self-contained blob with the vault public key.
 */
export async function encryptFileWithVaultKey(
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  fileBytes: Uint8Array,
  context: CryptoContextInput,
): Promise<Uint8Array> {
  const { blob } = await encryptFileWithVaultKeyAndOverlays(vaultPublicKey, vaultKeyVersion, fileBytes, context, []);

  return blob;
}

export async function encryptFileWithVaultKeyAndOverlays(
  vaultPublicKey: PublicEncryptionKey,
  vaultKeyVersion: number,
  fileBytes: Uint8Array,
  context: CryptoContextInput,
  overlayRecipients: readonly RecipientDescriptor[],
): Promise<EncryptedFileWithOverlays> {
  return encryptFileWithRecipients(
    fileBytes,
    context,
    [orgVaultRecipient(vaultPublicKey, vaultKeyVersion)],
    overlayRecipients,
  );
}

async function encryptFileWithRecipients(
  fileBytes: Uint8Array,
  context: CryptoContextInput,
  storedRecipients: readonly RecipientDescriptor[],
  overlayRecipients: readonly RecipientDescriptor[],
): Promise<EncryptedFileWithOverlays> {
  const recipients = [...storedRecipients, ...overlayRecipients];

  assertAllowedRecipients(
    context.purpose,
    recipients.map((recipient) => recipient.recipient),
  );

  const dek = randomBytes(32);

  try {
    const encrypted = await encryptBinaryData(fileBytes, dek, dataAad(context));
    const [storedKeys, overlayKeys] = await Promise.all([
      wrapFileKeys(dek, context, storedRecipients),
      wrapFileKeys(dek, context, overlayRecipients),
    ]);

    const metadata: EncryptedFileMetadata = {
      v: ALGORITHM_SUITE_VERSION,
      purpose: context.purpose,
      iv: encrypted.iv,
      keys: storedKeys,
      originalSize: fileBytes.length,
    };

    return {
      blob: packEncryptedBlob(metadata, encrypted.ct),
      overlayKeys,
    };
  } finally {
    dek.fill(0);
  }
}

/**
 * Decrypt a self-contained encrypted file using the vault private key.
 */
export async function decryptFileWithVaultKey(
  blob: Uint8Array,
  vaultPrivateKey: Uint8Array,
  context: CryptoContextInput,
): Promise<Uint8Array> {
  const { metadata, ciphertext } = unpackEncryptedBlob(blob);
  validateFileMetadata(metadata, context);

  const key = metadata.keys.find((candidate) => candidate.recipient === 'org_vault');

  if (!key) {
    throw new Error('File envelope key not found for recipient: org_vault');
  }

  return decryptFileWithEnvelopeKeyParts(ciphertext, metadata, key, vaultPrivateKey, context);
}

async function decryptFileWithEnvelopeKeyParts(
  ciphertext: Uint8Array,
  metadata: EncryptedFileMetadata,
  key: EnvelopeKey,
  privateKey: Uint8Array,
  context: CryptoContextInput,
): Promise<Uint8Array> {
  const dek = await unwrapDek(envelopeKeyToWrappedKey(key), privateKey, keyWrapAad(context, key.recipient));

  try {
    const decrypted = await decryptBinaryData(ciphertext, metadata.iv, dek, dataAad(context));

    if (decrypted.length !== metadata.originalSize) {
      throw new Error('File envelope originalSize mismatch');
    }

    return decrypted;
  } finally {
    dek.fill(0);
  }
}

function wrapFileKeys(
  dek: Uint8Array,
  context: CryptoContextInput,
  recipients: readonly RecipientDescriptor[],
): Promise<EnvelopeKey[]> {
  return Promise.all(recipients.map((recipient) => wrapRecipientKey(dek, context, recipient)));
}

function validateFileMetadata(metadata: EncryptedFileMetadata, context: CryptoContextInput): void {
  if (metadata.purpose !== context.purpose) {
    throw new Error(`File envelope purpose mismatch: expected ${context.purpose}, got ${metadata.purpose}`);
  }

  assertAllowedRecipients(
    context.purpose,
    metadata.keys.map((key) => key.recipient),
  );
}
