import { CandidateSearchCache } from '../candidate-search-cache';
import { RememberedDeviceStore } from '../remembered-device-store';
import type { UserKeyIdentity } from '../schemas/unlock-api';
import { createCryptoSessionIdentity } from '../session';
import { UnlockApi } from '../worker/unlock-api';

/**
 * Revoke auth and purge local records independently of Worker availability.
 */
export async function logoutSession(
  baseUrl: string,
  allDevices: boolean,
  cacheUserId: string | undefined,
  identity?: UserKeyIdentity,
): Promise<void> {
  const api = new UnlockApi(baseUrl);
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
      await api.logoutEverywhere(signal);
    } else {
      await api.logout(deviceId, signal);
    }

    if (storageError) {
      throw storageError;
    }
  } finally {
    await Promise.all([
      store.forgetAll(),
      cacheUserId && globalThis.indexedDB ? new CandidateSearchCache().purgeAccount(cacheUserId) : Promise.resolve(),
    ]);
  }
}
