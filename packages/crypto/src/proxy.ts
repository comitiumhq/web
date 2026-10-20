import * as Comlink from 'comlink';

import type { CandidateProfileSearchField } from './candidate-profile-search-hash';
import type { CryptoContextInput } from './context';
import type { SearchableCustomFieldType } from './custom-field-search';
import type { CategoricalFormFieldKind } from './form-field-search-hash';
import type { RecipientDescriptor } from './recipients';
import { RememberedDeviceStore } from './remembered-device-store';
import type { EncryptedEnvelope, EnvelopeKey, PublicEncryptionKey } from './schemas';
import type { WrappedKey } from './schemas/keys';
import type {
  FreshAuthenticationHandler,
  RecoveryCodeHandler,
  RewrapOptions,
  UnlockResult,
  UserKeyIdentity,
} from './schemas/unlock-api';
import type { WrappedUserKey } from './schemas/user-key';
import type { VaultKeyAccess, VaultKeyContext } from './schemas/vault-key';
import { type CryptoSessionIdentity, createCryptoSessionIdentity, isSameCryptoSession } from './session';
import type { CryptoWorkerApi } from './worker/crypto-api';
import { CryptoWorkerClient } from './worker/crypto-worker-client';
import { UnlockApi } from './worker/unlock-api';

let workerClient: CryptoWorkerClient | null = null;
let _isActive = false;
let activeSession: CryptoSessionIdentity | null = null;
let isResetting = false;
let apiBaseUrl: string | null = null;
let lifecycle = 0;
let unlockPromise: Promise<UnlockResult> | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function resetRuntimeState(): void {
  _isActive = false;
  activeSession = null;
  lifecycle += 1;
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

  if (!apiBaseUrl) {
    throw new Error('Call CryptoProxy.init with the API URL before using crypto');
  }

  const client = new CryptoWorkerClient(() => {
    if (workerClient === client) {
      workerClient = null;

      resetRuntimeState();
      notify();
    }
  }, apiBaseUrl);

  workerClient = client;

  return client;
}

async function runOnWorker<Result>(
  operation: (api: Comlink.Remote<CryptoWorkerApi>) => Promise<Result>,
): Promise<Result> {
  const generation = lifecycle;
  const result = await ensureWorker().run(operation);

  assertLifecycle(generation);

  return result;
}

function assertLifecycle(generation: number): void {
  if (generation !== lifecycle || isResetting) {
    throw new Error('Crypto runtime was cleared during the operation');
  }
}

async function unlockIdentity(
  wrapped: WrappedUserKey,
  userId: string,
  operation: (api: Comlink.Remote<CryptoWorkerApi>) => Promise<UnlockResult>,
): Promise<UnlockResult> {
  const identity = createCryptoSessionIdentity(wrapped, userId);

  if (unlockPromise) {
    throw new Error('An unlock is already in progress; wait before submitting another credential');
  }

  const pending = (async () => {
    if (_isActive) {
      await CryptoProxy.clear();
    }

    const generation = lifecycle;
    const result = await runOnWorker(operation);

    assertLifecycle(generation);

    activeSession = identity;
    _isActive = true;

    notify();

    return result;
  })();

  unlockPromise = pending;

  try {
    return await pending;
  } finally {
    if (unlockPromise === pending) {
      unlockPromise = null;
    }
  }
}

/**
 * CryptoProxy — main thread facade for the Crypto Worker.
 *
 * Long-lived keys and secret API responses remain inside the Worker.
 *
 * React integration:
 * - `subscribe()` + `isActive()` work with `useSyncExternalStore`
 * - Unlock and clear operations notify subscribers
 */
export const CryptoProxy = {
  /**
   * Eagerly initialize the crypto Worker.
   * Configure once with the product API URL before using the Worker.
   */
  init(baseUrl: string): void {
    if (apiBaseUrl && apiBaseUrl !== baseUrl) {
      throw new Error('Crypto API URL cannot change during the page lifetime');
    }

    apiBaseUrl = baseUrl;

    ensureWorker();
  },

  unlockWithPassword(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    password: string,
    rememberDevice: boolean,
  ): Promise<UnlockResult> {
    return unlockIdentity(wrapped, userId, (api) =>
      api.unlockWithPassword(wrapped, userId, publicKey, password, rememberDevice),
    );
  },

  verifyPassword(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    password: string,
  ): Promise<void> {
    return runOnWorker((api) => api.verifyPassword(wrapped, userId, publicKey, password));
  },

  unlockWithRecoveryCode(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    recoveryCode: string,
    rememberDevice: boolean,
  ): Promise<UnlockResult> {
    return unlockIdentity(wrapped, userId, (api) =>
      api.unlockWithRecoveryCode(wrapped, userId, publicKey, recoveryCode, rememberDevice),
    );
  },

  verifyRecoveryCode(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    recoveryCode: string,
  ): Promise<void> {
    return runOnWorker((api) => api.verifyRecoveryCode(wrapped, userId, publicKey, recoveryCode));
  },

  async tryUnlockWithRememberedDevice(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
  ): Promise<boolean> {
    resetRuntimeState();
    notify();

    const generation = lifecycle;
    const unlocked = await runOnWorker((api) => api.tryUnlockWithRememberedDevice(wrapped, userId, publicKey));

    assertLifecycle(generation);

    if (unlocked) {
      activeSession = createCryptoSessionIdentity(wrapped, userId);

      _isActive = true;

      notify();
    }

    return unlocked;
  },

  isActiveFor(wrapped: WrappedUserKey, userId: string): boolean {
    return _isActive && isSameCryptoSession(activeSession, createCryptoSessionIdentity(wrapped, userId));
  },

  /**
   * Session is fully initialized (user key available in Worker).
   * Synchronous — uses cached value on main thread.
   */
  isActive(): boolean {
    return _isActive;
  },

  /**
   * Wipe all cached keys in Worker + reset main thread state.
   */
  async clear(): Promise<void> {
    resetRuntimeState();
    notify();

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
    wrappedVaultKey: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Record<string, unknown>> {
    return runOnWorker((api) => api.decryptApplication(envelope, orgId, wrappedVaultKey, context));
  },

  async rewrapEnvelopeKey(
    orgId: string,
    wrappedVaultKey: VaultKeyAccess,
    sourceKey: EnvelopeKey,
    context: CryptoContextInput,
    recipient: RecipientDescriptor,
  ): Promise<EnvelopeKey> {
    return runOnWorker((api) => api.rewrapEnvelopeKey(orgId, wrappedVaultKey, sourceKey, context, recipient));
  },

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
    wrappedVaultKey: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<Uint8Array> {
    return runOnWorker((api) =>
      api.decryptFile(Comlink.transfer(blob, [blob.buffer]), orgId, wrappedVaultKey, context),
    );
  },

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
    wrappedVaultKey: VaultKeyAccess,
    context: CryptoContextInput,
  ): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForOrganization(envelope, orgId, wrappedVaultKey, context));
  },

  async decryptEmailContentForApplicant(envelope: EncryptedEnvelope, context: CryptoContextInput): Promise<unknown> {
    return runOnWorker((api) => api.decryptEmailContentForApplicant(envelope, context));
  },

  async initializeUserKey(
    userId: string,
    password: string,
    rememberDevice: boolean,
    onRecoveryCode?: RecoveryCodeHandler,
  ) {
    await this.clear();

    const generation = lifecycle;
    const result = await runOnWorker((api) =>
      api.initializeUserKey(
        userId,
        password,
        rememberDevice,
        onRecoveryCode ? Comlink.proxy(onRecoveryCode) : undefined,
      ),
    );

    assertLifecycle(generation);

    activeSession = createCryptoSessionIdentity(result.encryptedUserKey, userId);
    _isActive = true;

    notify();

    return result;
  },

  async resetUserKey(
    userId: string,
    previous: WrappedUserKey,
    password: string,
    rememberDevice: boolean,
    onRecoveryCode: RecoveryCodeHandler,
    confirmFreshAuth: FreshAuthenticationHandler,
  ) {
    await confirmFreshAuth();
    await this.clear();

    const generation = lifecycle;
    const result = await runOnWorker((api) =>
      api.resetUserKey(
        userId,
        previous,
        password,
        rememberDevice,
        Comlink.proxy(onRecoveryCode),
        Comlink.proxy(confirmFreshAuth),
      ),
    );

    assertLifecycle(generation);

    activeSession = createCryptoSessionIdentity(result.encryptedUserKey, userId);
    _isActive = true;

    notify();

    return result;
  },

  rewrapUserKey(
    wrapped: WrappedUserKey,
    options: RewrapOptions,
    onRecoveryCode: RecoveryCodeHandler,
    confirmFreshAuth: FreshAuthenticationHandler,
  ) {
    return runOnWorker((api) =>
      api.rewrapUserKey(wrapped, options, Comlink.proxy(onRecoveryCode), Comlink.proxy(confirmFreshAuth)),
    );
  },

  async rewrapWithRememberedDevice(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    options: RewrapOptions & { password: string },
    onRecoveryCode: RecoveryCodeHandler,
    confirmFreshAuth: FreshAuthenticationHandler,
  ) {
    const generation = lifecycle;
    const result = await runOnWorker((api) =>
      api.rewrapWithRememberedDevice(
        wrapped,
        userId,
        publicKey,
        options,
        Comlink.proxy(onRecoveryCode),
        Comlink.proxy(confirmFreshAuth),
      ),
    );

    assertLifecycle(generation);

    activeSession = createCryptoSessionIdentity(result.encryptedUserKey, userId);
    _isActive = true;

    notify();

    return result;
  },

  async forgetRememberedDevice(wrapped: WrappedUserKey, userId: string, publicKey: PublicEncryptionKey): Promise<void> {
    resetRuntimeState();
    notify();

    await runOnWorker((api) => api.forgetRememberedDevice(wrapped, userId, publicKey));
  },

  async logout(allDevices: boolean, identity?: UserKeyIdentity): Promise<void> {
    terminateWorker();
    notify();

    if (!apiBaseUrl) {
      throw new Error('Encryption API URL is not configured');
    }

    const api = new UnlockApi(apiBaseUrl);
    const store = new RememberedDeviceStore();

    let deviceId: string | undefined;
    let storageError: unknown;

    if (!allDevices && identity) {
      try {
        const record = await store.load({
          identity: createCryptoSessionIdentity(identity.wrapped, identity.userId),
          userPublicKey: identity.publicKey,
        });

        deviceId = record?.deviceId;
      } catch (error) {
        storageError = error;
      }
    }

    try {
      const signal = AbortSignal.timeout(30_000);

      if (allDevices) {
        await api.revokeAll(signal);
      } else {
        await api.logout(deviceId, signal);
      }

      if (storageError) {
        throw storageError;
      }
    } finally {
      await store.forgetAll();
    }
  },

  generateAndWrapVaultKey(orgId: string, ownerPublicKey: PublicEncryptionKey): Promise<VaultKeyAccess> {
    return runOnWorker((api) => api.generateAndWrapVaultKey(orgId, ownerPublicKey));
  },

  grantVaultAccess(
    ownAccess: VaultKeyAccess,
    memberPublicKey: PublicEncryptionKey,
    recipient: Pick<VaultKeyContext, 'recipientUserId' | 'recipientKeyVersion'>,
  ): Promise<WrappedKey> {
    return runOnWorker((api) => api.grantVaultAccess(ownAccess, memberPublicKey, recipient));
  },

  async hashTagLabel(orgId: string, wrappedVaultKey: VaultKeyAccess, label: string): Promise<string> {
    return runOnWorker((api) => api.hashTagLabel(orgId, wrappedVaultKey, label));
  },

  async hashCustomFieldValue(
    orgId: string,
    wrappedVaultKey: VaultKeyAccess,
    fieldId: string,
    fieldType: SearchableCustomFieldType,
    plaintext: unknown,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCustomFieldValue(orgId, wrappedVaultKey, fieldId, fieldType, plaintext));
  },

  async hashCandidateProfileSearchValue(
    orgId: string,
    wrappedVaultKey: VaultKeyAccess,
    field: CandidateProfileSearchField,
    value: string | number,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCandidateProfileSearchValue(orgId, wrappedVaultKey, field, value));
  },

  async hashCategoricalFormFieldValue(
    orgId: string,
    wrappedVaultKey: VaultKeyAccess,
    fieldId: string,
    kind: CategoricalFormFieldKind,
    value: boolean | string,
  ): Promise<string> {
    return runOnWorker((api) => api.hashCategoricalFormFieldValue(orgId, wrappedVaultKey, fieldId, kind, value));
  },
};
