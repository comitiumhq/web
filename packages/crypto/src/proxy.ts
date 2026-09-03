import * as Comlink from 'comlink';
import { type Address, type Hex, hashMessage, sha256 } from 'viem';

import type { CryptoContextInput } from './context';
import type { SearchableCustomFieldType } from './custom-field-hash';
import type { WrappedKey } from './envelope-key';
import { canonicalizeEvmSignature, type WrappedPersonalKey } from './personal-key';
import type { RecipientDescriptor } from './recipients';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from './schemas';
import { type CryptoSessionIdentity, createCryptoSessionIdentity, isSameCryptoSession } from './session';
import type { CryptoWorkerApi } from './worker/crypto-api';

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

let worker: Worker | null = null;
let proxy: Comlink.Remote<CryptoWorkerApi> | null = null;
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

function terminateWorker(): void {
  if (proxy) {
    proxy[Comlink.releaseProxy]();
    proxy = null;
  }

  if (worker) {
    worker.terminate();
    worker = null;
  }

  _isActive = false;
  activeSession = null;
  pendingSignature = null;
  unlockPromise = null;
  unlockSession = null;
}

function ensureWorker(): void {
  if (isResetting) {
    throw new Error('Crypto runtime was reset; reload the page');
  }

  if (worker) {
    return;
  }

  if (typeof Worker === 'undefined') {
    throw new Error('CryptoProxy requires a browser environment (Web Workers not available)');
  }

  worker = new Worker(new URL('./worker/crypto.worker.ts', import.meta.url), {
    type: 'module',
  });

  proxy = Comlink.wrap<CryptoWorkerApi>(worker);
}

function getProxy(): Comlink.Remote<CryptoWorkerApi> {
  ensureWorker();

  if (!proxy) {
    throw new Error('Crypto worker proxy not available');
  }

  return proxy;
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
      const api = getProxy();
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
      if (proxy) {
        await proxy.clear();
      }
    } catch (error) {
      terminateWorker();
      notify();

      throw error;
    }

    _isActive = false;
    activeSession = null;
    pendingSignature = null;
    unlockPromise = null;
    unlockSession = null;
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
    return getProxy().encryptApplication(vaultPublicKey, vaultKeyVersion, data, context);
  },

  async encryptApplicationWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: unknown,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ) {
    return getProxy().encryptApplicationWithOverlays(vaultPublicKey, vaultKeyVersion, data, context, overlayRecipients);
  },

  async decryptApplication(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    return getProxy().decryptApplication(envelope, orgId, wrappedVaultKey, context);
  },

  async rewrapEnvelopeKey(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    return getProxy().rewrapEnvelopeKey(orgId, wrappedVaultKey, sourceKey, context, recipient);
  },

  // --- File Encryption (Resume PDF) ---

  async encryptFile(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return getProxy().encryptFile(vaultPublicKey, vaultKeyVersion, Comlink.transfer(data, [data.buffer]), context);
  },

  async encryptFileWithOverlays(
    vaultPublicKey: PublicEncryptionKey,
    vaultKeyVersion: number,
    data: Uint8Array,
    context: CryptoContextInput,
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ blob: Uint8Array; overlayKeys: EnvelopeKey[] }> {
    return getProxy().encryptFileWithOverlays(
      vaultPublicKey,
      vaultKeyVersion,
      Comlink.transfer(data, [data.buffer]),
      context,
      overlayRecipients,
    );
  },

  async decryptFile(
    blob: Uint8Array,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return getProxy().decryptFile(Comlink.transfer(blob, [blob.buffer]), orgId, wrappedVaultKey, context);
  },

  // --- Email Content Encryption ---

  async encryptEmailContent(
    data: unknown,
    context: CryptoContextInput,
    recipients: RecipientDescriptor[],
  ): Promise<EncryptedEnvelope> {
    return getProxy().encryptEmailContent(data, context, recipients);
  },

  async encryptEmailContentWithOverlays(
    data: unknown,
    context: CryptoContextInput,
    storedRecipients: RecipientDescriptor[],
    overlayRecipients: RecipientDescriptor[],
  ): Promise<{ envelope: EncryptedEnvelope; overlayKeys: EnvelopeKey[] }> {
    return getProxy().encryptEmailContentWithOverlays(data, context, storedRecipients, overlayRecipients);
  },

  async decryptEmailContentForOrganization(
    envelope: EncryptedEnvelope,
    orgId: string,
    wrappedVaultKey: WrappedKey,
    context: CryptoContextInput,
  ): Promise<unknown> {
    return getProxy().decryptEmailContentForOrganization(envelope, orgId, wrappedVaultKey, context);
  },

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    return getProxy().decryptEmailContentForApplicant(envelope, context);
  },

  // --- Key Generation ---

  async generateAndWrapPersonalKey(
    signature: Hex,
    address: Address,
    keyShare: string,
  ): Promise<{ publicKey: PublicEncryptionKey; encryptedPersonalKey: WrappedPersonalKey }> {
    return getProxy().generateAndWrapPersonalKey(signature, address, keyShare);
  },

  async generateAndWrapVaultKey(
    ownerPublicKey: PublicEncryptionKey,
  ): Promise<{ vaultPublicKey: PublicEncryptionKey; wrappedVaultKey: WrappedKey }> {
    return getProxy().generateAndWrapVaultKey(ownerPublicKey);
  },

  // --- Vault Access ---

  async grantVaultAccess(ownWrappedVaultKey: WrappedKey, memberPublicKey: PublicEncryptionKey): Promise<WrappedKey> {
    return getProxy().grantVaultAccess(ownWrappedVaultKey, memberPublicKey);
  },

  // --- Tag Hash ---

  async hashTagLabel(orgId: string, wrappedVaultKey: WrappedKey, normalizedLabel: string): Promise<string> {
    return getProxy().hashTagLabel(orgId, wrappedVaultKey, normalizedLabel);
  },

  // --- Custom Field Hash ---

  async hashCustomFieldValue(
    orgId: string,
    wrappedVaultKey: WrappedKey,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    return getProxy().hashCustomFieldValue(orgId, wrappedVaultKey, fieldId, fieldType, plaintext);
  },
};
