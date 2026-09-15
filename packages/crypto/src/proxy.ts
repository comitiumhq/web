import * as Comlink from 'comlink';
import { type Address, type Hex, hashMessage, sha256 } from 'viem';

import type { CandidateProfileSearchField } from './candidate-profile-search-hash';
import type { CryptoContextInput } from './context';
import type { SearchableCustomFieldType } from './custom-field-search';
import type { WrappedKey } from './envelope-key';
import type { CategoricalFormFieldKind } from './form-field-search-hash';
import { canonicalizeEvmSignature, type WrappedPersonalKey } from './personal-key';
import type { RecipientDescriptor } from './recipients';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from './schemas';
import { type CryptoSessionIdentity, createCryptoSessionIdentity, isSameCryptoSession } from './session';
import type { CryptoWorkerApi } from './worker/crypto-api';
import { CryptoWorkerClient } from './worker/crypto-worker-client';

export type SignMessageFn = (message: string) => Promise<Hex>;
export type GetUserKeyShareFn = () => Promise<{ keyShare: string; version: number }>;

export interface SignatureStabilityResult {
  providerId: string;
  address: Address;
  messageHash: string;
  firstSignatureHash: string;
  secondSignatureHash: string;
  stable: boolean;
}

const ENCRYPTION_UNLOCK_NAMESPACE = 'comitium.personal-key-wrapping';

export function createEncryptionUnlockMessage(address: string): string {
  const wallet = address.toLowerCase();

  return [
    'Comitium encryption unlock',
    '',
    `Key namespace: ${ENCRYPTION_UNLOCK_NAMESPACE}`,
    `Wallet: ${wallet}`,
    '',
    'This signature unlocks your encrypted personal key.',
    'It does not authorize a blockchain transaction or server action.',
  ].join('\n');
}

let workerClient: CryptoWorkerClient | null = null;
let _isActive = false;
let activeSession: CryptoSessionIdentity | null = null;
let isResetting = false;
let pendingSignature: { message: string; promise: Promise<Hex> } | null = null;
let unlockPromise: Promise<void> | null = null;
let unlockSession: CryptoSessionIdentity | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function resetRuntimeState(): void {
  _isActive = false;
  activeSession = null;
  pendingSignature = null;
  unlockPromise = null;
  unlockSession = null;
}

function terminateWorker(): void {
  const currentClient = workerClient;
  workerClient = null;
  currentClient?.dispose();
  resetRuntimeState();
}

function ensureWorker(): CryptoWorkerClient {
  if (isResetting) {
    throw new Error('Crypto runtime was reset; reload the page');
  }

  if (workerClient) {
    return workerClient;
  }

  const client = new CryptoWorkerClient(() => {
    if (workerClient === client) {
      workerClient = null;
      resetRuntimeState();
      notify();
    }
  });
  workerClient = client;

  return client;
}

function runOnWorker<Result>(operation: (api: Comlink.Remote<CryptoWorkerApi>) => Promise<Result>): Promise<Result> {
  return ensureWorker().run(operation);
}

/**
 * CryptoProxy — main thread facade for the Crypto Worker.
 *
 * Long-lived key material stays inside the Worker; signature/share inputs are handed through once per fallback unlock.
 *
 * React integration:
 * - `subscribe()` + `isActive()` work with `useSyncExternalStore`
 * - State changes in `unlock()` and `clear()` notify subscribers
 */
export const CryptoProxy = {
  /**
   * Eagerly initialize the crypto Worker.
   * Optional — Worker auto-initializes on first use.
   */
  init(): void {
    ensureWorker();
  },

  /**
   * Get or request wallet signature. One popup per session.
   * Deduplicates concurrent calls — only one wallet popup.
   */
  async ensureSignature(signMessage: SignMessageFn, address: Address): Promise<Hex> {
    const message = createEncryptionUnlockMessage(address);

    if (pendingSignature?.message === message) {
      return pendingSignature.promise;
    }

    if (pendingSignature) {
      await pendingSignature.promise.catch(() => undefined);
    }

    const pending = { message, promise: signMessage(message) };
    pendingSignature = pending;

    try {
      return await pending.promise;
    } finally {
      if (pendingSignature === pending) {
        pendingSignature = null;
      }
    }
  },

  /**
   * Diagnostic only: signs the same unlock message twice to verify provider byte stability.
   */
  async checkSignatureStability(
    signMessage: SignMessageFn,
    address: Address,
    providerId: string,
  ): Promise<SignatureStabilityResult> {
    const message = createEncryptionUnlockMessage(address);
    const firstSignature = await signMessage(message);
    const secondSignature = await signMessage(message);
    const firstCanonicalSignature = canonicalizeEvmSignature(firstSignature);
    const secondCanonicalSignature = canonicalizeEvmSignature(secondSignature);

    return {
      providerId,
      address: address.toLowerCase() as Address,
      messageHash: hashMessage(message),
      firstSignatureHash: sha256(firstCanonicalSignature),
      secondSignatureHash: sha256(secondCanonicalSignature),
      stable: firstCanonicalSignature === secondCanonicalSignature,
    };
  },

  /**
   * Unlock crypto session through remembered-device first, wallet signature fallback second.
   * Deduplicates concurrent calls for the same session.
   */
  async unlock(
    signMessage: SignMessageFn,
    wrappedPersonalKey: WrappedPersonalKey,
    address: Address,
    personalPublicKey: PublicEncryptionKey,
    getUserKeyShare: GetUserKeyShareFn,
  ): Promise<void> {
    const targetSession = createCryptoSessionIdentity(wrappedPersonalKey, address);

    if (_isActive && isSameCryptoSession(activeSession, targetSession)) {
      return;
    }

    if (unlockPromise) {
      if (isSameCryptoSession(unlockSession, targetSession)) {
        return unlockPromise;
      }

      await unlockPromise.catch(() => undefined);
    }

    if (_isActive) {
      await this.clear();
    }

    unlockSession = targetSession;
    unlockPromise = (async () => {
      await runOnWorker(async (api) => {
        const didUnlockWithRememberedDevice = await api
          .tryUnlockWithRememberedDevice(wrappedPersonalKey, address, personalPublicKey)
          .catch(() => false);

        if (isResetting) {
          throw new Error('Crypto runtime was reset while unlocking');
        }

        if (!didUnlockWithRememberedDevice) {
          const signature = await this.ensureSignature(signMessage, address);
          const { keyShare } = await getUserKeyShare();

          await api.unlock(signature, wrappedPersonalKey, address, personalPublicKey, keyShare);
        }

        if (isResetting) {
          throw new Error('Crypto runtime was reset while unlocking');
        }
      });

      activeSession = targetSession;
      _isActive = true;
      notify();
    })();

    try {
      await unlockPromise;
    } finally {
      if (isSameCryptoSession(unlockSession, targetSession)) {
        unlockPromise = null;
        unlockSession = null;
      }
    }
  },

  isActiveFor(wrappedPersonalKey: WrappedPersonalKey, address: Address): boolean {
    return _isActive && isSameCryptoSession(activeSession, createCryptoSessionIdentity(wrappedPersonalKey, address));
  },

  /**
   * Session is fully initialized (personal key available in Worker).
   * Synchronous — uses cached value on main thread.
   */
  isActive(): boolean {
    return _isActive;
  },

  /**
   * Wipe all cached keys in Worker + reset main thread state.
   */
  async clear(): Promise<void> {
    try {
      if (workerClient) {
        await workerClient.run((api) => api.clear());
      }
    } catch (error) {
      terminateWorker();
      notify();

      throw error;
    }

    resetRuntimeState();
    notify();
  },

  reset(): void {
    isResetting = true;
    terminateWorker();
    notify();
  },

  /**
   * Terminate the Worker entirely. Call on app unmount.
   */
  async destroy(): Promise<void> {
    terminateWorker();
  },

  /**
   * Subscribe to session state changes.
   * Compatible with React's `useSyncExternalStore`.
   */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  // --- Application Encryption ---

  async encryptApplication(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
  ): Promise<EncryptedEnvelope> {
    return runOnWorker((api) => api.encryptApplication(vaultPublicKey, vaultKeyVersion, data, context));
  },

  async encryptApplicationWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ) {
    return runOnWorker((api) =>
      api.encryptApplicationWithOverlays(vaultPublicKey, vaultKeyVersion, data, context, overlayRecipients),
    );
  },

  async decryptApplication(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    return runOnWorker((api) => api.decryptApplication(envelope, orgId, wrappedVaultKey, context));
  },

  async rewrapEnvelopeKey(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    return runOnWorker((api) => api.rewrapEnvelopeKey(orgId, wrappedVaultKey, sourceKey, context, recipient));
  },

  // --- File Encryption (Resume PDF) ---

  async encryptFile(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return runOnWorker((api) =>
      api.encryptFile(vaultPublicKey, vaultKeyVersion, Comlink.transfer(data, [data.buffer]), context),
    );
  },

  async encryptFileWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ blob: Uint8Array; overlayKeys: EnvelopeKey[] }> {
    return runOnWorker((api) =>
      api.encryptFileWithOverlays(
        vaultPublicKey,
        vaultKeyVersion,
        Comlink.transfer(data, [data.buffer]),
        context,
        overlayRecipients,
      ),
    );
  },

  async decryptFile(
    blob: Uint8Array,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return runOnWorker((api) =>
      api.decryptFile(Comlink.transfer(blob, [blob.buffer]), orgId, wrappedVaultKey, context),
    );
  },

  // --- Email Content Encryption ---

  async encryptEmailContent(
    data: unknown,
    context: CryptoContextInput,
    recipients: RecipientDescriptor[],
  ): Promise<EncryptedEnvelope> {
    return runOnWorker((api) => api.encryptEmailContent(data, context, recipients));
  },

  async encryptEmailContentWithOverlays(
    data: unknown,
    context: CryptoContextInput,
    storedRecipients: RecipientDescriptor[],
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ envelope: EncryptedEnvelope; overlayKeys: EnvelopeKey[] }> {
    return runOnWorker((api) =>
      api.encryptEmailContentWithOverlays(data, context, storedRecipients, overlayRecipients),
    );
  },

  async decryptEmailContentForOrganization(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForOrganization(envelope, orgId, wrappedVaultKey, context));
  },

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForApplicant(envelope, context));
  },

  // --- Key Generation ---

  async generateAndWrapPersonalKey(
    signature: Hex,
    address: Address,
    keyShare: string,
  ): Promise<{ publicKey: PublicEncryptionKey; encryptedPersonalKey: WrappedPersonalKey }> {
    return runOnWorker((api) => api.generateAndWrapPersonalKey(signature, address, keyShare));
  },

  async generateAndWrapVaultKey(
    ownerPublicKey: PublicEncryptionKey,
  ): Promise<{ vaultPublicKey: PublicEncryptionKey; wrappedVaultKey: WrappedKey }> {
    return runOnWorker((api) => api.generateAndWrapVaultKey(ownerPublicKey));
  },

  // --- Vault Access ---

  async grantVaultAccess(ownWrappedVaultKey: WrappedKey, memberPublicKey: PublicEncryptionKey): Promise<WrappedKey> {
    return runOnWorker((api) => api.grantVaultAccess(ownWrappedVaultKey, memberPublicKey));
  },

  // --- Tag Hash ---

  async hashTagLabel(orgId: string, wrappedVaultKey: WrappedKey, label: string): Promise<string> {
    return runOnWorker((api) => api.hashTagLabel(orgId, wrappedVaultKey, label));
  },

  // --- Custom Field Hash ---

  async hashCustomFieldValue(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCustomFieldValue(orgId, wrappedVaultKey, fieldId, fieldType, plaintext));
  },

  async hashCandidateProfileSearchValue(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    field: CandidateProfileSearchField,
    value: string | number,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCandidateProfileSearchValue(orgId, wrappedVaultKey, field, value));
  },

  async hashCategoricalFormFieldValue(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    fieldId: string,
    kind: CategoricalFormFieldKind,
    value: boolean | string,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCategoricalFormFieldValue(orgId, wrappedVaultKey, fieldId, kind, value));
  },
};
