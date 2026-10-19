import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import type { PublicEncryptionKey } from '../schemas';
import type {
  KeyBundleResponse,
  KeyBundleWrite,
  KeyShareResponse,
  RecoveryCodeHandler,
  RememberedDeviceStatus,
  RewrapOptions,
  UnlockResult,
  UserKeyIdentity,
} from '../schemas/unlock-api';
import type { UnlockedUserKey, WrappedUserKey } from '../schemas/user-key';
import { type CryptoSessionIdentity, createCryptoSessionIdentity, isSameCryptoSession } from '../session';
import {
  createPasswordWrap,
  createRecoveryWrap,
  decryptUserKey,
  encodeKeyAuthSecret,
  generateRecoveryCode,
  generateUserKeyPair,
  unlockUserKey,
  userKeyWrapsFingerprint,
  wrapUserKey,
} from '../user-key';
import { isSamePublicEncryptionKey } from '../xwing';
import { KeyStore } from './key-store';
import { RememberedDeviceStore } from './remembered-device-store';
import { UnlockApi } from './unlock-api';
import { isUnlockApiClientError, UnlockApiError } from './unlock-api-error';

/**
 * Owns user unlock, recovery and device lifecycle inside the Worker.
 */
export class UserKeySession {
  readonly keys = new KeyStore();
  private rememberedDeviceStore = new RememberedDeviceStore();

  private activeSession: CryptoSessionIdentity | null = null;

  private userPublicKey: PublicEncryptionKey | null = null;

  private unlockApi: UnlockApi | null = null;

  private requests = new AbortController();

  configure(apiBaseUrl: string): void {
    if (this.unlockApi) {
      throw new Error('Encryption API is already configured');
    }

    this.unlockApi = new UnlockApi(apiBaseUrl);
  }

  async unlockWithPassword(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    password: string,
    rememberDevice: boolean,
  ): Promise<UnlockResult> {
    this.clear();

    const generation = this.keys.captureGeneration();
    const share = await this.api().getKeyShare(this.requests.signal);

    this.assertShareBinding(share, wrapped);

    const userKey = await unlockUserKey(wrapped, userId, publicKey, {
      method: 'password',
      password,
      keyShare: share.keyShare,
    });

    return this.installUserKey(userKey, wrapped, userId, publicKey, generation, rememberDevice);
  }

  async unlockWithRecoveryCode(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    recoveryCode: string,
    rememberDevice: boolean,
  ): Promise<UnlockResult> {
    this.clear();

    const generation = this.keys.captureGeneration();
    const userKey = await unlockUserKey(wrapped, userId, publicKey, { method: 'recovery_code', recoveryCode });

    return this.installUserKey(userKey, wrapped, userId, publicKey, generation, rememberDevice);
  }

  async tryUnlockWithRememberedDevice(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
  ): Promise<boolean> {
    const identity = createCryptoSessionIdentity(wrapped, userId);

    if (isSameCryptoSession(this.activeSession, identity) && this.matchesPublicKey(publicKey)) {
      return true;
    }

    this.clear();

    const generation = this.keys.captureGeneration();
    const record = await this.rememberedDeviceStore.load({ identity, userPublicKey: publicKey });

    if (!record) {
      return false;
    }

    let response: Awaited<ReturnType<UnlockApi['getDeviceKey']>>;

    try {
      response = await this.api().getDeviceKey(record.deviceId, this.requests.signal);
    } catch (error) {
      if (error instanceof UnlockApiError && [404, 410].includes(error.status)) {
        await this.rememberedDeviceStore.delete(identity);

        return false;
      }

      /**
       * Auth expiry and temporary failures must preserve the encrypted local record.
       */
      throw error;
    }

    const serverDeviceKey = base64.decode(response.serverDeviceKey);
    let unlockKey: Uint8Array | undefined;

    try {
      if (response.deviceId !== record.deviceId) {
        throw new Error('Device key response does not match the requested device');
      }

      unlockKey = await this.rememberedDeviceStore.decrypt(record, serverDeviceKey);

      const userPrivateKey = await decryptUserKey(wrapped, userId, unlockKey, publicKey);

      this.keys.storeUserKey({ userPrivateKey, unlockKey }, generation);
      this.activeSession = identity;
      this.userPublicKey = publicKey;

      return true;
    } catch (error) {
      unlockKey?.fill(0);

      if (this.keys.captureGeneration() === generation) {
        await this.rememberedDeviceStore.delete(identity);
      }

      throw error;
    } finally {
      serverDeviceKey.fill(0);
    }
  }

  async initializeUserKey(
    userId: string,
    password: string,
    rememberDevice: boolean,
    onRecoveryCode: RecoveryCodeHandler,
  ) {
    this.clear();

    const generation = this.keys.captureGeneration();
    const share = await this.api().getKeyShare(this.requests.signal);

    if (share.keyVersion !== null || share.wrapsFingerprint !== null) {
      throw new Error('User key bundle already exists');
    }

    return this.createAndSaveUserKey(userId, 1, password, share.keyShare, generation, rememberDevice, onRecoveryCode);
  }

  async resetUserKey(
    userId: string,
    previous: WrappedUserKey,
    password: string,
    rememberDevice: boolean,
    onRecoveryCode: RecoveryCodeHandler,
  ) {
    this.clear();

    const generation = this.keys.captureGeneration();
    const shareBytes = randomBytes(32);

    try {
      return await this.createAndSaveUserKey(
        userId,
        previous.keyVersion + 1,
        password,
        base64.encode(shareBytes),
        generation,
        rememberDevice,
        onRecoveryCode,
        previous,
      );
    } finally {
      shareBytes.fill(0);
    }
  }

  async rewrapUserKey(
    wrapped: WrappedUserKey,
    options: RewrapOptions,
    onRecoveryCode: RecoveryCodeHandler,
  ): Promise<{ encryptedUserKey: WrappedUserKey; recoveryCode: string | null }> {
    const identity = this.requireIdentity();
    const target = createCryptoSessionIdentity(wrapped, identity.userId);

    if (!isSameCryptoSession(identity, target)) {
      throw new Error('User key bundle does not match the unlocked identity');
    }

    if (options.password === undefined && !options.rotateRecoveryCode) {
      throw new Error('Choose a new password or recovery code');
    }

    if (options.repairShare && options.password === undefined) {
      throw new Error('A new storage password is required to repair the share');
    }

    const generation = this.keys.captureGeneration();
    const unlockKey = this.keys.getUnlockKey();
    const wraps = [...wrapped.wraps];
    const recoveryCode = options.rotateRecoveryCode ? generateRecoveryCode() : null;
    const replacement = options.repairShare ? randomBytes(32) : null;

    try {
      if (options.password !== undefined) {
        let keyShare: string;

        if (replacement) {
          keyShare = base64.encode(replacement);
        } else {
          const share = await this.api().getKeyShare(this.requests.signal);

          this.assertShareBinding(share, wrapped);

          keyShare = share.keyShare;
        }

        const index = wraps.findIndex((wrap) => wrap.method === 'password');

        wraps[index] = await createPasswordWrap(unlockKey, identity, options.password, keyShare);
      }

      if (recoveryCode) {
        const index = wraps.findIndex((wrap) => wrap.method === 'recovery_code');

        wraps[index] = await createRecoveryWrap(unlockKey, identity, recoveryCode);

        await this.confirmRecoveryCode(recoveryCode, onRecoveryCode, generation);
      }

      this.keys.assertGeneration(generation);

      const saved = await this.readBackBundle(
        this.api().rewrap(
          {
            keyVersion: wrapped.keyVersion,
            prevWrapsFingerprint: userKeyWrapsFingerprint(wrapped.wraps),
            wraps,
            keyAuthSecret: encodeKeyAuthSecret(unlockKey, identity),
            ...(replacement ? { replacementKeyShare: base64.encode(replacement) } : {}),
          },
          this.requests.signal,
        ),
        generation,
      );

      this.keys.assertGeneration(generation);

      if (
        saved.id !== identity.userId ||
        !isSameCryptoSession(identity, createCryptoSessionIdentity(saved.encryptedUserKey, saved.id)) ||
        userKeyWrapsFingerprint(saved.encryptedUserKey.wraps) !== userKeyWrapsFingerprint(wraps)
      ) {
        throw new Error('Saved user key wrappers do not match the requested update');
      }

      return { encryptedUserKey: saved.encryptedUserKey, recoveryCode };
    } finally {
      replacement?.fill(0);
    }
  }

  async rewrapWithRememberedDevice(
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    options: RewrapOptions & { password: string },
    onRecoveryCode: RecoveryCodeHandler,
  ) {
    const unlocked = await this.tryUnlockWithRememberedDevice(wrapped, userId, publicKey);

    if (!unlocked) {
      throw new Error('Remembered device is unavailable');
    }

    return this.rewrapUserKey(wrapped, options, onRecoveryCode);
  }

  async forgetRememberedDevice(wrapped: WrappedUserKey, userId: string, publicKey: PublicEncryptionKey): Promise<void> {
    this.clear();

    const record = await this.rememberedDeviceStore.load({
      identity: createCryptoSessionIdentity(wrapped, userId),
      userPublicKey: publicKey,
    });

    try {
      if (record) {
        await this.api().revokeDevice(record.deviceId, this.requests.signal);
      }
    } finally {
      await this.rememberedDeviceStore.forgetAll();
    }
  }

  async logout(allDevices: boolean, identity?: UserKeyIdentity): Promise<void> {
    let params: { identity: CryptoSessionIdentity; userPublicKey: PublicEncryptionKey } | null = null;

    if (identity) {
      params = {
        identity: createCryptoSessionIdentity(identity.wrapped, identity.userId),
        userPublicKey: identity.publicKey,
      };
    } else if (this.activeSession && this.userPublicKey) {
      params = { identity: this.activeSession, userPublicKey: this.userPublicKey };
    }

    this.clear();

    const record = params ? await this.rememberedDeviceStore.load(params) : null;

    try {
      if (allDevices) {
        await this.api().revokeAll(this.requests.signal);
      } else {
        await this.api().logout(record?.deviceId, this.requests.signal);
      }
    } finally {
      await this.rememberedDeviceStore.forgetAll();
    }
  }

  isActive(): boolean {
    return this.keys.isActive();
  }

  clear(): void {
    this.requests.abort();
    this.requests = new AbortController();
    this.activeSession = null;
    this.userPublicKey = null;
    this.keys.clear();
  }

  requireIdentity(): CryptoSessionIdentity {
    if (!this.activeSession || !this.keys.isActive()) {
      throw new Error('Crypto session not unlocked');
    }

    return this.activeSession;
  }

  /**
   * Reconcile an ambiguous write by reading state, without repeating the mutation.
   */
  private async readBackBundle(mutation: Promise<unknown>, generation: number): Promise<KeyBundleResponse> {
    let writeError: unknown;

    try {
      await mutation;
    } catch (error) {
      if (isUnlockApiClientError(error)) {
        throw error;
      }

      writeError = error;
    }

    this.keys.assertGeneration(generation);

    try {
      return await this.api().getBundle(this.requests.signal);
    } catch (error) {
      if (isUnlockApiClientError(error)) {
        throw error;
      }

      throw writeError ?? error;
    }
  }

  private api(): UnlockApi {
    if (!this.unlockApi) {
      throw new Error('Encryption API has not been configured');
    }

    return this.unlockApi;
  }

  private assertShareBinding(share: KeyShareResponse, wrapped: WrappedUserKey): void {
    if (share.keyVersion !== wrapped.keyVersion || share.wrapsFingerprint !== userKeyWrapsFingerprint(wrapped.wraps)) {
      throw new Error('Key share snapshot does not match the user key wrappers');
    }
  }

  private async installUserKey(
    userKey: UnlockedUserKey,
    wrapped: WrappedUserKey,
    userId: string,
    publicKey: PublicEncryptionKey,
    generation: number,
    rememberDevice: boolean,
  ): Promise<UnlockResult> {
    const identity = createCryptoSessionIdentity(wrapped, userId);

    try {
      this.keys.assertGeneration(generation);

      const rememberedDevice = rememberDevice
        ? await this.rememberCurrentDevice(userKey, wrapped, identity, publicKey, generation)
        : 'not_requested';

      this.keys.assertGeneration(generation);

      this.keys.storeUserKey(userKey, generation);

      this.activeSession = identity;

      this.userPublicKey = publicKey;

      return { rememberedDevice };
    } catch (error) {
      userKey.userPrivateKey.fill(0);
      userKey.unlockKey.fill(0);

      throw error;
    }
  }

  private async rememberCurrentDevice(
    userKey: UnlockedUserKey,
    wrapped: WrappedUserKey,
    identity: CryptoSessionIdentity,
    publicKey: PublicEncryptionKey,
    generation: number,
  ): Promise<RememberedDeviceStatus> {
    if (!this.rememberedDeviceStore.isSupported()) {
      return 'unavailable';
    }

    let deviceId: string | undefined;
    let serverDeviceKey: Uint8Array | undefined;
    let enrollmentStarted = false;

    try {
      const context = { identity, userPublicKey: publicKey };
      const previous = await this.rememberedDeviceStore.load(context);

      this.keys.assertGeneration(generation);

      enrollmentStarted = true;

      const device = await this.api().enrollDevice(
        {
          keyVersion: wrapped.keyVersion,
          prevWrapsFingerprint: userKeyWrapsFingerprint(wrapped.wraps),
          keyAuthSecret: encodeKeyAuthSecret(userKey.unlockKey, identity),
          ...(previous ? { previousDeviceId: previous.deviceId } : {}),
        },
        this.requests.signal,
      );

      deviceId = device.deviceId;
      serverDeviceKey = base64.decode(device.serverDeviceKey);

      this.keys.assertGeneration(generation);

      await this.rememberedDeviceStore.save(context, deviceId, serverDeviceKey, userKey.unlockKey, () =>
        this.keys.assertGeneration(generation),
      );

      this.keys.assertGeneration(generation);

      return 'remembered';
    } catch (error) {
      let result: RememberedDeviceStatus = enrollmentStarted ? 'cleanup_failed' : 'unavailable';

      if (deviceId) {
        result = await this.cleanupDeviceEnrollment(deviceId);
      }

      this.keys.assertGeneration(generation);

      if (isUnlockApiClientError(error)) {
        throw error;
      }

      return result;
    } finally {
      serverDeviceKey?.fill(0);
    }
  }

  private async cleanupDeviceEnrollment(deviceId: string): Promise<'unavailable' | 'cleanup_failed'> {
    try {
      await this.api().revokeDevice(deviceId, this.requests.signal);

      return 'unavailable';
    } catch (error) {
      if (isUnlockApiClientError(error)) {
        throw error;
      }

      return 'cleanup_failed';
    }
  }

  /**
   * Wait for the recovery screen before writing, while allowing clear/logout to wipe pending keys.
   */
  private async confirmRecoveryCode(
    recoveryCode: string,
    handler: RecoveryCodeHandler,
    generation: number,
  ): Promise<void> {
    this.keys.assertGeneration(generation);

    const signal = this.requests.signal;
    let rejectOnAbort!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(new Error('Crypto session was cleared during recovery confirmation'));

      signal.addEventListener('abort', rejectOnAbort, { once: true });
    });

    try {
      const confirmation = Promise.resolve().then(() => {
        this.keys.assertGeneration(generation);

        return handler(recoveryCode);
      });

      await Promise.race([confirmation, aborted]);

      this.keys.assertGeneration(generation);
    } finally {
      signal.removeEventListener('abort', rejectOnAbort);
    }
  }

  private async createAndSaveUserKey(
    userId: string,
    keyVersion: number,
    password: string,
    keyShare: string,
    generation: number,
    rememberDevice: boolean,
    onRecoveryCode: RecoveryCodeHandler,
    previous?: WrappedUserKey,
  ) {
    const { privateKey, publicKey } = generateUserKeyPair();
    const unlockKey = randomBytes(32);
    const recoveryCode = generateRecoveryCode();
    const context = { userId, keyVersion };

    try {
      const encryptedUserKey = await wrapUserKey(privateKey, unlockKey, context, password, keyShare, recoveryCode);
      let saved: KeyBundleResponse;

      const body: KeyBundleWrite = {
        publicKey,
        encryptedUserKey,
        keyAuthSecret: encodeKeyAuthSecret(unlockKey, context),
      };

      await this.confirmRecoveryCode(recoveryCode, onRecoveryCode, generation);

      this.keys.assertGeneration(generation);

      if (previous) {
        saved = await this.readBackBundle(
          this.api().reset(
            {
              ...body,
              keyVersion: previous.keyVersion,
              prevWrapsFingerprint: userKeyWrapsFingerprint(previous.wraps),
              replacementKeyShare: keyShare,
            },
            this.requests.signal,
          ),
          generation,
        );
      } else {
        saved = await this.readBackBundle(this.api().initialize(body, this.requests.signal), generation);
      }

      const share = await this.api().getKeyShare(this.requests.signal);

      this.assertShareBinding(share, saved.encryptedUserKey);

      if (
        saved.id !== userId ||
        saved.userKeyVersion !== keyVersion ||
        !isSamePublicEncryptionKey(saved.publicKey, publicKey) ||
        !isSameCryptoSession(
          createCryptoSessionIdentity(encryptedUserKey, userId),
          createCryptoSessionIdentity(saved.encryptedUserKey, saved.id),
        ) ||
        userKeyWrapsFingerprint(saved.encryptedUserKey.wraps) !== userKeyWrapsFingerprint(encryptedUserKey.wraps)
      ) {
        throw new Error('Saved user key bundle does not match the requested identity');
      }

      const userKey = await unlockUserKey(saved.encryptedUserKey, userId, saved.publicKey, {
        method: 'password',
        password,
        keyShare: share.keyShare,
      });

      const result = await this.installUserKey(
        userKey,
        saved.encryptedUserKey,
        userId,
        saved.publicKey,
        generation,
        rememberDevice,
      );

      return { publicKey: saved.publicKey, encryptedUserKey: saved.encryptedUserKey, recoveryCode, ...result };
    } finally {
      privateKey.fill(0);
      unlockKey.fill(0);
    }
  }

  matchesPublicKey(publicKey: PublicEncryptionKey): boolean {
    return this.userPublicKey !== null && isSamePublicEncryptionKey(this.userPublicKey, publicKey);
  }
}
