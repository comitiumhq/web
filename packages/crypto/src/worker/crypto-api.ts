import * as Comlink from 'comlink';
import type { Address, Hex } from 'viem';
import {
  decryptApplicationWithVaultKey,
  encryptApplicationWithVaultKey,
  encryptApplicationWithVaultKeyAndOverlays,
} from '../application-encryption';
import type { CryptoContextInput } from '../context';
import { keyWrapAad } from '../context';
import {
  deriveCustomFieldHashKey,
  hmacCustomFieldValue,
  normalizeCustomFieldValue,
  type SearchableCustomFieldType,
} from '../custom-field-hash';
import {
  decryptEmailContentWithPersonalKey,
  decryptEmailContentWithVaultKey,
  encryptEmailContent,
  encryptEmailContentWithOverlays,
} from '../email-encryption';
import { envelopeKeyToWrappedKey, unwrapDek, type WrappedKey, wrapRecipientKey } from '../envelope-key';
import {
  decryptFileWithVaultKey,
  type EncryptedFileWithOverlays,
  encryptFileWithVaultKey,
  encryptFileWithVaultKeyAndOverlays,
} from '../file-encryption';
import {
  decryptPersonalKeyWithWrappingKey,
  generatePersonalKeyPair,
  unwrapPersonalKeyWithWrappingKey,
  type WrappedPersonalKey,
  wrapPersonalKey,
} from '../personal-key';
import type { RecipientDescriptor } from '../recipients';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from '../schemas';
import { type CryptoSessionIdentity, createCryptoSessionIdentity, isSameCryptoSession } from '../session';
import { deriveTagHashKey, hmacTagLabel } from '../tag-hash';
import {
  generateVaultKeyPair,
  grantVaultAccess as grantVaultAccessFn,
  unwrapVaultKey,
  wrapVaultKey,
} from '../vault-key';
import { KeyStore } from './key-store';
import { RememberedDeviceStore } from './remembered-device-store';

/**
 * Crypto Worker API — all cryptographic operations run here.
 * Unwrapped private key material never leaves this Worker's heap.
 */
export class CryptoWorkerApi {
  private keyStore = new KeyStore();
  private rememberedDeviceStore = new RememberedDeviceStore();
  private activeSession: CryptoSessionIdentity | null = null;

  // --- Lifecycle ---

  async unlock(
    signature: Hex,
    wrappedPersonalKey: WrappedPersonalKey,
    address: Address,
    personalPublicKey: PublicEncryptionKey,
    keyShare: string,
  ): Promise<void> {
    const targetSession = createCryptoSessionIdentity(wrappedPersonalKey, address);

    if (this.keyStore.isActive() && isSameCryptoSession(this.activeSession, targetSession)) {
      return;
    }

    if (this.keyStore.isActive()) {
      this.clear();
    }

    const { personalKey, personalKeyWrappingKey } = await unwrapPersonalKeyWithWrappingKey(
      wrappedPersonalKey,
      signature,
      address,
      keyShare,
    );

    try {
      this.keyStore.storePersonalKey(personalKey);
      this.activeSession = targetSession;

      await this.rememberedDeviceStore
        .save(
          {
            identity: targetSession,
            personalPublicKey,
          },
          personalKeyWrappingKey,
        )
        .catch(() => undefined);
    } finally {
      personalKeyWrappingKey.fill(0);
    }
  }

  async tryUnlockWithRememberedDevice(
    wrappedPersonalKey: WrappedPersonalKey,
    address: Address,
    personalPublicKey: PublicEncryptionKey,
  ): Promise<boolean> {
    const targetSession = createCryptoSessionIdentity(wrappedPersonalKey, address);

    if (this.keyStore.isActive() && isSameCryptoSession(this.activeSession, targetSession)) {
      return true;
    }

    if (this.keyStore.isActive()) {
      this.clear();
    }

    const record = await this.rememberedDeviceStore
      .load({
        identity: targetSession,
        personalPublicKey,
      })
      .catch(() => null);

    if (!record) {
      return false;
    }

    const personalKeyWrappingKey = await this.rememberedDeviceStore.decrypt(record).catch(async () => {
      await this.rememberedDeviceStore.delete(targetSession);

      return null;
    });

    if (!personalKeyWrappingKey) {
      return false;
    }

    const personalKey = await decryptPersonalKeyWithWrappingKey(wrappedPersonalKey, personalKeyWrappingKey).catch(
      async () => {
        personalKeyWrappingKey.fill(0);
        await this.rememberedDeviceStore.delete(targetSession);

        return null;
      },
    );

    if (!personalKey) {
      return false;
    }

    personalKeyWrappingKey.fill(0);
    this.keyStore.storePersonalKey(personalKey);
    this.activeSession = targetSession;

    return true;
  }

  isActive(): boolean {
    return this.keyStore.isActive();
  }

  clear(): void {
    this.activeSession = null;
    this.keyStore.clear();
  }

  // --- Application Encryption ---

  async encryptApplication(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
  ): Promise<EncryptedEnvelope> {
    return encryptApplicationWithVaultKey(vaultPublicKey, vaultKeyVersion, data, context);
  }

  async encryptApplicationWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ) {
    return encryptApplicationWithVaultKeyAndOverlays(vaultPublicKey, vaultKeyVersion, data, context, overlayRecipients);
  }

  async decryptApplication(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);

    return decryptApplicationWithVaultKey<Record<string, unknown>>(envelope, vaultKey, context);
  }

  async rewrapEnvelopeKey(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    if (sourceKey.recipient !== 'org_vault') {
      throw new Error('Processing regrant source key must target org_vault');
    }

    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);
    const dek = await unwrapDek(envelopeKeyToWrappedKey(sourceKey), vaultKey, keyWrapAad(context, sourceKey.recipient));

    try {
      return await wrapRecipientKey(dek, context, recipient);
    } finally {
      dek.fill(0);
    }
  }

  // --- File Encryption (Resume PDF) ---

  async encryptFile(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    const result = await encryptFileWithVaultKey(vaultPublicKey, vaultKeyVersion, data, context);

    return Comlink.transfer(result, [result.buffer]);
  }

  async encryptFileWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ): Promise<EncryptedFileWithOverlays> {
    const result = await encryptFileWithVaultKeyAndOverlays(
      vaultPublicKey,
      vaultKeyVersion,
      data,
      context,
      overlayRecipients,
    );

    return Comlink.transfer(result, [result.blob.buffer]);
  }

  async decryptFile(
    blob: Uint8Array,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);
    const result = await decryptFileWithVaultKey(blob, vaultKey, context);

    return Comlink.transfer(result, [result.buffer]);
  }

  // --- Email Content Encryption ---

  async encryptEmailContent(
    data: unknown,
    context: CryptoContextInput,
    recipients: RecipientDescriptor[],
  ): Promise<EncryptedEnvelope> {
    return encryptEmailContent(data, context, recipients);
  }

  async encryptEmailContentWithOverlays(
    data: unknown,
    context: CryptoContextInput,
    storedRecipients: RecipientDescriptor[],
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ envelope: EncryptedEnvelope; overlayKeys: EnvelopeKey[] }> {
    return encryptEmailContentWithOverlays(data, context, storedRecipients, overlayRecipients);
  }

  async decryptEmailContentForOrganization(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<unknown> {
    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);

    return decryptEmailContentWithVaultKey(envelope, vaultKey, context);
  }

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    const personalKey = this.keyStore.getPersonalKey();

    return decryptEmailContentWithPersonalKey(envelope, personalKey, context);
  }

  // --- Key Generation ---

  async generateAndWrapPersonalKey(
    signature: Hex,
    address: Address,
    keyShare: string,
  ): Promise<{ publicKey: PublicEncryptionKey; encryptedPersonalKey: WrappedPersonalKey }> {
    const { privateKey, publicKey } = generatePersonalKeyPair();

    try {
      const encryptedPersonalKey = await wrapPersonalKey(privateKey, signature, address, keyShare);

      return { publicKey, encryptedPersonalKey };
    } finally {
      privateKey.fill(0);
    }
  }

  async generateAndWrapVaultKey(
    ownerPublicKey: PublicEncryptionKey,
  ): Promise<{ vaultPublicKey: PublicEncryptionKey; wrappedVaultKey: WrappedKey }> {
    const { privateKey, publicKey } = generateVaultKeyPair();

    try {
      const wrappedVaultKey = await wrapVaultKey(privateKey, ownerPublicKey);

      return { vaultPublicKey: publicKey, wrappedVaultKey };
    } finally {
      privateKey.fill(0);
    }
  }

  // --- Vault Access ---

  async grantVaultAccess(ownWrappedVaultKey: WrappedKey, memberPublicKey: PublicEncryptionKey): Promise<WrappedKey> {
    const personalKey = this.keyStore.getPersonalKey();

    return grantVaultAccessFn(ownWrappedVaultKey, personalKey, memberPublicKey);
  }

  // --- Tag Hash ---

  async hashTagLabel(orgId: string, wrappedVaultKey: WrappedKey, normalizedLabel: string): Promise<string> {
    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);
    const tagHashKey = deriveTagHashKey(vaultKey);

    try {
      return hmacTagLabel(tagHashKey, normalizedLabel);
    } finally {
      tagHashKey.fill(0);
    }
  }

  // --- Custom Field Hash ---

  async hashCustomFieldValue(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    const vaultKey = await this.ensureVaultKey(orgId, wrappedVaultKey);
    const hashKey = deriveCustomFieldHashKey(vaultKey, orgId, fieldId, fieldType);

    try {
      const normalized = normalizeCustomFieldValue(plaintext, fieldType);

      return hmacCustomFieldValue(hashKey, normalized);
    } finally {
      hashKey.fill(0);
    }
  }

  // --- Internal ---

  private async ensureVaultKey(orgId: string, wrappedVaultKey: WrappedKey): Promise<Uint8Array> {
    return this.keyStore.getOrUnwrapVaultKey(orgId, wrappedVaultKey, (wrapped, personalKey) =>
      unwrapVaultKey(wrapped as WrappedKey, personalKey),
    );
  }
}
