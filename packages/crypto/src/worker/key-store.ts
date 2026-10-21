import { keyMetadataFingerprint } from '../key-context';
import type { UnlockedUserKey } from '../schemas/user-key';
import type { VaultKeyAccess } from '../schemas/vault-key';

/**
 * Owns current user/U material and version/context-bound organization caches.
 */
export class KeyStore {
  private userKey: UnlockedUserKey | null = null;
  private readonly vaultKeys = new Map<string, Uint8Array>();
  private readonly searchKeys = new Map<string, Uint8Array>();
  private readonly pending = new Map<string, Promise<Uint8Array>>();
  private generation = 0;

  captureGeneration(): number {
    return this.generation;
  }

  assertGeneration(generation: number): void {
    if (this.generation !== generation) {
      throw new Error('Crypto session was cleared during the operation');
    }
  }

  storeUserKey(userKey: UnlockedUserKey, generation: number): void {
    try {
      this.assertGeneration(generation);
    } catch (error) {
      userKey.userPrivateKey.fill(0);
      userKey.unlockKey.fill(0);

      throw error;
    }

    if (this.userKey) {
      throw new Error('Clear the previous crypto identity before unlocking');
    }

    this.userKey = userKey;
  }

  getUserPrivateKey(): Uint8Array {
    return this.requireUserKey().userPrivateKey;
  }

  getUnlockKey(): Uint8Array {
    return this.requireUserKey().unlockKey;
  }

  getOrUnwrapVaultKey(access: VaultKeyAccess, unwrap: () => Promise<Uint8Array>): Promise<Uint8Array> {
    /**
     * Includes expected public key and the exact grant/recipient generation, even on cache hits.
     */
    const identity = keyMetadataFingerprint({
      orgId: access.orgId,
      vaultKeyVersion: access.vaultKeyVersion,
      vaultPublicKey: access.vaultPublicKey,
      recipientUserId: access.recipientUserId,
      recipientKeyVersion: access.recipientKeyVersion,
      wrappedVaultKey: access.wrappedVaultKey,
    });

    return this.getOrLoad(`vault:${access.orgId}:${access.vaultKeyVersion}:${identity}`, this.vaultKeys, unwrap);
  }

  getOrUnwrapSearchKey(access: VaultKeyAccess, unwrap: () => Promise<Uint8Array>): Promise<Uint8Array> {
    const identity = keyMetadataFingerprint({ searchKey: access.searchKey, vaultPublicKey: access.vaultPublicKey });

    return this.getOrLoad(
      `search:${access.orgId}:${access.searchKey.searchKeyVersion}:${identity}`,
      this.searchKeys,
      unwrap,
    );
  }

  isActive(): boolean {
    return this.userKey !== null;
  }

  clear(): void {
    this.generation += 1;

    this.userKey?.userPrivateKey.fill(0);
    this.userKey?.unlockKey.fill(0);

    this.userKey = null;

    for (const keys of [this.vaultKeys, this.searchKeys]) {
      for (const key of keys.values()) {
        key.fill(0);
      }

      keys.clear();
    }

    this.pending.clear();
  }

  private requireUserKey(): UnlockedUserKey {
    if (!this.userKey) {
      throw new Error('Crypto session not unlocked');
    }

    return this.userKey;
  }

  private async getOrLoad(
    identity: string,
    cache: Map<string, Uint8Array>,
    load: () => Promise<Uint8Array>,
  ): Promise<Uint8Array> {
    this.requireUserKey();

    const cached = cache.get(identity);

    if (cached) {
      return cached;
    }

    const pending = this.pending.get(identity);

    if (pending) {
      return pending;
    }

    const generation = this.generation;
    const promise = (async () => {
      const key = await load();

      try {
        this.assertGeneration(generation);
      } catch (error) {
        key.fill(0);

        throw error;
      }

      cache.set(identity, key);

      return key;
    })();

    this.pending.set(identity, promise);

    try {
      return await promise;
    } finally {
      if (this.pending.get(identity) === promise) {
        this.pending.delete(identity);
      }
    }
  }
}
