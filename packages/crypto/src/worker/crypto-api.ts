import * as Comlink from 'comlink';
import {
  decryptApplicationWithVaultKey,
  encryptApplicationWithVaultKey,
  encryptApplicationWithVaultKeyAndOverlays,
} from '../application-encryption';
import { type CandidateProfileSearchField, hashCandidateProfileSearchValue } from '../candidate-profile-search-hash';
import type { CandidateProjectionItem } from '../candidate-projections';
import type { CryptoContextInput } from '../context';
import { keyWrapAad } from '../context';
import { hashCustomFieldValue } from '../custom-field-hash';
import type { SearchableCustomFieldType } from '../custom-field-search';
import {
  decryptEmailContentWithUserKey,
  decryptEmailContentWithVaultKey,
  encryptEmailContent,
  encryptEmailContentWithOverlays,
} from '../email-encryption';
import { envelopeKeyToWrappedKey, unwrapDek, wrapRecipientKey } from '../envelope-key';
import {
  decryptFileWithVaultKey,
  type EncryptedFileWithOverlays,
  encryptFileWithVaultKey,
  encryptFileWithVaultKeyAndOverlays,
  unpackEncryptedBlob,
} from '../file-encryption';
import { type CategoricalFormFieldKind, hashCategoricalFormFieldValue } from '../form-field-search-hash';
import type { RecipientDescriptor } from '../recipients';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from '../schemas';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { hashTagLabel } from '../tag-hash';
import { processCandidateProjection } from './candidate-projection';
import { OrgVault } from './org-vault';
import { UserKeySession } from './user-key-session';

/**
 * Exposes concrete crypto operations through Comlink; raw keys remain internal.
 */
export class CryptoWorkerApi {
  readonly #userSession = new UserKeySession();
  readonly #orgVault = new OrgVault(this.#userSession);

  readonly configure = this.#userSession.configure.bind(this.#userSession);
  readonly unlockWithPassword = this.#userSession.unlockWithPassword.bind(this.#userSession);
  readonly verifyPassword = this.#userSession.verifyPassword.bind(this.#userSession);
  readonly verifyRecoveryCode = this.#userSession.verifyRecoveryCode.bind(this.#userSession);
  readonly unlockWithRecoveryCode = this.#userSession.unlockWithRecoveryCode.bind(this.#userSession);
  readonly tryUnlockWithRememberedDevice = this.#userSession.tryUnlockWithRememberedDevice.bind(this.#userSession);
  readonly initializeUserKey = this.#userSession.initializeUserKey.bind(this.#userSession);
  readonly resetUserKey = this.#userSession.resetUserKey.bind(this.#userSession);
  readonly rewrapUserKey = this.#userSession.rewrapUserKey.bind(this.#userSession);
  readonly rewrapWithRememberedDevice = this.#userSession.rewrapWithRememberedDevice.bind(this.#userSession);
  readonly forgetRememberedDevice = this.#userSession.forgetRememberedDevice.bind(this.#userSession);
  readonly isActive = this.#userSession.isActive.bind(this.#userSession);
  readonly clear = this.#userSession.clear.bind(this.#userSession);
  readonly generateAndWrapVaultKey = this.#orgVault.generateAndWrapVaultKey.bind(this.#orgVault);
  readonly grantVaultAccess = this.#orgVault.grantVaultAccess.bind(this.#orgVault);

  ready(): true {
    return true;
  }

  async processCandidateProjection(orgId: string, vaultAccess: VaultKeyAccess, item: CandidateProjectionItem) {
    return processCandidateProjection(this, orgId, vaultAccess, item);
  }

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
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    this.assertVaultRecipient(envelope.keys, vaultAccess);

    const vaultKey = await this.#orgVault.getVaultKey(orgId, vaultAccess);

    return decryptApplicationWithVaultKey<Record<string, unknown>>(envelope, vaultKey, context);
  }

  async rewrapEnvelopeKey(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    if (sourceKey.recipient !== 'org_vault' || sourceKey.rkv !== vaultAccess.vaultKeyVersion) {
      throw new Error('Processing regrant source key must target org_vault');
    }

    const vaultKey = await this.#orgVault.getVaultKey(orgId, vaultAccess);
    const dek = await unwrapDek(envelopeKeyToWrappedKey(sourceKey), vaultKey, keyWrapAad(context, sourceKey.recipient));

    try {
      return await wrapRecipientKey(dek, context, recipient);
    } finally {
      dek.fill(0);
    }
  }

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
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    this.assertVaultRecipient(unpackEncryptedBlob(blob).metadata.keys, vaultAccess);

    const vaultKey = await this.#orgVault.getVaultKey(orgId, vaultAccess);
    const result = await decryptFileWithVaultKey(blob, vaultKey, context);

    return Comlink.transfer(result, [result.buffer]);
  }

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
    vaultAccess: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<unknown> {
    this.assertVaultRecipient(envelope.keys, vaultAccess);

    const vaultKey = await this.#orgVault.getVaultKey(orgId, vaultAccess);

    return decryptEmailContentWithVaultKey(envelope, vaultKey, context);
  }

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    const identity = this.#userSession.requireIdentity();

    if (envelope.keys.find((key) => key.recipient === 'applicant')?.rkv !== identity.keyVersion) {
      throw new Error('User key generation is unavailable');
    }

    const userPrivateKey = this.#userSession.keys.getUserPrivateKey();

    return decryptEmailContentWithUserKey(envelope, userPrivateKey, context);
  }

  async hashTagLabel(orgId: string, vaultAccess: VaultKeyAccess, label: string): Promise<string> {
    const searchKey = await this.#orgVault.getSearchKey(orgId, vaultAccess);

    return hashTagLabel(searchKey, label);
  }

  async hashCustomFieldValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    const searchKey = await this.#orgVault.getSearchKey(orgId, vaultAccess);

    return hashCustomFieldValue(searchKey, orgId, fieldId, fieldType, plaintext);
  }

  async hashCandidateProfileSearchValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    field: CandidateProfileSearchField,
    value: string | number,
  ): Promise<string> {
    const searchKey = await this.#orgVault.getSearchKey(orgId, vaultAccess);

    return hashCandidateProfileSearchValue(searchKey, orgId, field, value);
  }

  async hashCategoricalFormFieldValue(
    orgId: string,
    vaultAccess: VaultKeyAccess,
    fieldId: string,
    kind: CategoricalFormFieldKind,
    value: boolean | string,
  ): Promise<string> {
    const searchKey = await this.#orgVault.getSearchKey(orgId, vaultAccess);

    return hashCategoricalFormFieldValue(searchKey, orgId, fieldId, kind, value);
  }

  private assertVaultRecipient(keys: EnvelopeKey[], access: VaultKeyAccess): void {
    if (keys.find((key) => key.recipient === 'org_vault')?.rkv !== access.vaultKeyVersion) {
      throw new Error('Vault key generation is unavailable');
    }
  }
}
