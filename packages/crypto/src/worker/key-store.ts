/**
 * Isolated Web Worker key store — private key material never reaches the main thread.
 */
export class KeyStore {
  private personalKey: Uint8Array | null = null;
  private vaultKeys = new Map<string, Uint8Array>();
  private vaultKeyPromises = new Map<string, Promise<Uint8Array>>();
  private generation = 0;

  storePersonalKey(key: Uint8Array): void {
    this.personalKey = key;
  }

  getPersonalKey(): Uint8Array {
    if (!this.personalKey) {
      throw new Error('Crypto session not unlocked');
    }

    return this.personalKey;
  }

  storeVaultKey(orgId: string, key: Uint8Array): void {
    this.vaultKeys.set(orgId, key);
  }

  getVaultKey(orgId: string): Uint8Array | null {
    return this.vaultKeys.get(orgId) ?? null;
  }

  /**
   * Cached vault key for `orgId`, else unwrap once (concurrent callers share one promise).
   * `generation` guards it: a key unwrapped during `clear()` is zeroed, not cached.
   */
  async getOrUnwrapVaultKey(
    orgId: string,
    wrappedVaultKey: unknown,
    unwrapFn: (wrapped: unknown, personalKey: Uint8Array) => Promise<Uint8Array>,
  ): Promise<Uint8Array> {
    const cached = this.vaultKeys.get(orgId);

    if (cached) {
      return cached;
    }

    const pending = this.vaultKeyPromises.get(orgId);

    if (pending) {
      return pending;
    }

    const generation = this.generation;
    const personalKey = this.getPersonalKey();

    const promise = (async () => {
      const vaultKey = await unwrapFn(wrappedVaultKey, personalKey);

      if (this.generation !== generation) {
        vaultKey.fill(0);
        throw new Error('Crypto session cleared while unwrapping vault key');
      }

      this.vaultKeys.set(orgId, vaultKey);

      return vaultKey;
    })();

    this.vaultKeyPromises.set(orgId, promise);

    try {
      return await promise;
    } finally {
      if (this.vaultKeyPromises.get(orgId) === promise) {
        this.vaultKeyPromises.delete(orgId);
      }
    }
  }

  isActive(): boolean {
    return this.personalKey !== null;
  }

  clear(): void {
    this.generation += 1;

    if (this.personalKey) {
      this.personalKey.fill(0);
      this.personalKey = null;
    }

    for (const key of this.vaultKeys.values()) {
      key.fill(0);
    }

    this.vaultKeys.clear();
    this.vaultKeyPromises.clear();
  }
}
