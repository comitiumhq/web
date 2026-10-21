import { base64 } from '@scure/base';
import { expose, releaseProxy, wrap } from 'comlink';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashCandidateProfileSearchValue } from '../candidate-profile-search-hash';
import { hashCustomFieldValue } from '../custom-field-hash';
import { encryptEmailContent } from '../email-encryption';
import { hashCategoricalFormFieldValue } from '../form-field-search-hash';
import { applicantRecipient, orgVaultRecipient } from '../recipients';
import { RememberedDeviceStore } from '../remembered-device-store';
import type { PublicEncryptionKey } from '../schemas';
import type { WrappedUserKey } from '../schemas/user-key';
import { createCryptoSessionIdentity } from '../session';
import { hashTagLabel } from '../tag-hash';
import { userKeyWrapsFingerprint, wrapUserKey } from '../user-key';
import { CryptoWorkerApi } from '../worker/crypto-api';
import { TEST_KEYS } from './crypto-helpers';
import {
  DEVICE_ID,
  KEY_SHARE,
  ORG_ID,
  OTHER_USER_ID,
  PASSWORD,
  SEARCH_KEY,
  UNLOCK_KEY,
  USER_ID,
  userKeyFixture,
  vaultFixture,
} from './unlock-fixtures';

const storage = vi.hoisted(() => new Map<string, unknown>());
const storageHooks = vi.hoisted(() => ({ beforeWrite: undefined as (() => Promise<void>) | undefined }));

vi.mock('@noble/hashes/argon2.js', async () => {
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const { concatBytes } = await import('@noble/hashes/utils.js');

  return {
    argon2idAsync: async (password: Uint8Array, salt: Uint8Array) => sha256(concatBytes(password, salt)),
  };
});

vi.mock('idb-keyval', () => ({
  createStore: () => 'worker-test-store',
  get: async (key: string) => storage.get(key),
  update: async (key: string, updater: (value: unknown) => unknown) => {
    await storageHooks.beforeWrite?.();

    storage.set(key, updater(storage.get(key)));
  },
  del: async (key: string) => {
    storage.delete(key);
  },
  keys: async () => [...storage.keys()],
  clear: async () => {
    storage.clear();
  },
}));

const confirmFreshAuth = vi.fn(async (_force?: boolean) => {});
const DEVICE_KEY = new Uint8Array(32).fill(17);
const emailContext = { purpose: 'email_content' as const, orgId: ORG_ID, subjectId: OTHER_USER_ID, fieldId: 'message' };
const fixture = userKeyFixture();
let api: CryptoWorkerApi;
let bundle: WrappedUserKey;
let share: string;
let shareUserId: string;
let currentPublicKey: PublicEncryptionKey;
let keyless: boolean;
let deviceStatus: number;
let deviceCleanupStatus: number;
let lostEnrollmentResponse: boolean;
let brokenReadBack: boolean;
let lostWriteResponse: boolean;
let readBackStatus: number;
let staleWrites: number;
let requests: { path: string; method: string; body: Record<string, unknown> | null }[];

beforeAll(async () => {
  fixture.bundle = await wrapUserKey(
    TEST_KEYS.alice.privateKey,
    UNLOCK_KEY,
    { userId: USER_ID, keyVersion: 1 },
    PASSWORD,
    KEY_SHARE,
    fixture.recoveryCode,
  );
});

beforeEach(() => {
  confirmFreshAuth.mockClear();
  storage.clear();
  storageHooks.beforeWrite = undefined;
  vi.stubGlobal('indexedDB', {});
  bundle = structuredClone(fixture.bundle);
  share = KEY_SHARE;
  shareUserId = USER_ID;
  currentPublicKey = fixture.publicKey;
  keyless = false;
  deviceStatus = 200;
  deviceCleanupStatus = 200;
  lostEnrollmentResponse = false;
  brokenReadBack = false;
  lostWriteResponse = false;
  readBackStatus = 200;
  staleWrites = 0;
  requests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, options: RequestInit) => {
      const path = new URL(input).pathname;
      const method = options.method ?? 'GET';
      const body = options.body ? (JSON.parse(String(options.body)) as Record<string, unknown>) : null;

      requests.push({ path, method, body });

      if ((path.endsWith('/wraps') || path.endsWith('/encryption-key-bundle/reset')) && staleWrites > 0) {
        staleWrites -= 1;
        return Response.json({ error: { code: 'FRESH_AUTHENTICATION_REQUIRED' } }, { status: 403 });
      }

      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');

      if (path.endsWith('/key-share')) {
        return Response.json({
          userId: shareUserId,
          keyShare: share,
          version: 1,
          keyVersion: keyless ? null : bundle.keyVersion,
          wrapsFingerprint: keyless ? null : userKeyWrapsFingerprint(bundle.wraps),
        });
      }

      if (path.endsWith('/auth/bootstrap')) {
        if (readBackStatus !== 200) {
          return new Response(null, { status: readBackStatus });
        }

        return Response.json({
          id: USER_ID,
          publicKey: brokenReadBack ? TEST_KEYS.bob.publicKey : currentPublicKey,
          encryptedUserKey: bundle,
          userKeyVersion: bundle.keyVersion,
        });
      }

      if (path.endsWith('/encryption-key-bundle') || path.endsWith('/encryption-key-bundle/reset')) {
        bundle = body?.encryptedUserKey as WrappedUserKey;
        currentPublicKey = body?.publicKey as PublicEncryptionKey;
        keyless = false;

        if (body?.replacementKeyShare) {
          share = String(body.replacementKeyShare);
        }

        return lostWriteResponse ? new Response(null, { status: 503 }) : Response.json({ success: true });
      }

      if (path.endsWith('/encryption-key-bundle/wraps')) {
        bundle = { ...bundle, wraps: body?.wraps as WrappedUserKey['wraps'] };

        if (body?.replacementKeyShare) {
          share = String(body.replacementKeyShare);
        }

        return lostWriteResponse ? new Response(null, { status: 503 }) : Response.json({ success: true });
      }

      if (path.endsWith('/devices') || path.endsWith('/key')) {
        if (deviceStatus !== 200) {
          return new Response(null, { status: deviceStatus });
        }

        if (method === 'POST' && path.endsWith('/devices') && lostEnrollmentResponse) {
          throw new TypeError('Enrollment response lost');
        }

        return Response.json({ deviceId: DEVICE_ID, serverDeviceKey: base64.encode(DEVICE_KEY) });
      }

      if (method === 'DELETE' && deviceCleanupStatus !== 200) {
        return new Response(null, { status: deviceCleanupStatus });
      }

      return Response.json({ success: true });
    }),
  );
  api = new CryptoWorkerApi();

  api.configure('https://api.comitium.test/v1');
});

afterEach(() => {
  api.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function recoveryUnlock() {
  await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, false);
}

async function rememberFixture() {
  const store = new RememberedDeviceStore();

  await store.save(
    { identity: createCryptoSessionIdentity(bundle, USER_ID), userPublicKey: fixture.publicKey },
    DEVICE_ID,
    DEVICE_KEY,
    UNLOCK_KEY,
  );
}

describe('Worker unlock and recovery flows', () => {
  it('verifies recovery without unlocking, remembering a device or writing data', async () => {
    await api.verifyRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode);

    expect(api.isActive()).toBe(false);
    expect(storage.size).toBe(0);
    expect(requests).toEqual([]);

    await expect(api.verifyRecoveryCode(bundle, USER_ID, fixture.publicKey, 'bad code')).rejects.toThrow(
      'Recovery code is invalid',
    );
    await expect(
      api.verifyRecoveryCode(bundle, OTHER_USER_ID, fixture.publicKey, fixture.recoveryCode),
    ).rejects.toThrow();

    expect(api.isActive()).toBe(false);

    await recoveryUnlock();

    await expect(api.verifyRecoveryCode(bundle, USER_ID, fixture.publicKey, 'bad code')).rejects.toThrow();

    expect(api.isActive()).toBe(true);
  });

  it.each(['password', 'network', 'share'] as const)(
    'keeps an unlocked session after %s verification fails',
    async (failure) => {
      await recoveryUnlock();

      if (failure === 'network') {
        vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Offline'));
      } else if (failure === 'share') {
        vi.mocked(fetch).mockResolvedValueOnce(
          Response.json({ error: { code: 'KEY_SHARE_UNAVAILABLE' } }, { status: 503 }),
        );
      }

      await expect(api.verifyPassword(bundle, USER_ID, fixture.publicKey, 'incorrect password')).rejects.toThrow();
      expect(api.isActive()).toBe(true);
    },
    15000,
  );

  it.each(['reset', 'rewrap'] as const)(
    'retries only the prepared %s write after late fresh-auth expiry',
    async (operation) => {
      await recoveryUnlock();
      staleWrites = 1;
      const onRecoveryCode = vi.fn(async (_code: string) => {});
      const result =
        operation === 'reset'
          ? await api.resetUserKey(USER_ID, bundle, PASSWORD, false, onRecoveryCode, confirmFreshAuth)
          : await api.rewrapUserKey(
              bundle,
              { rotateRecoveryCode: true, repairShare: false },
              onRecoveryCode,
              confirmFreshAuth,
            );
      const writes = requests.filter((request) => request.path.endsWith(operation === 'reset' ? '/reset' : '/wraps'));

      expect(onRecoveryCode).toHaveBeenCalledOnce();
      expect(confirmFreshAuth).toHaveBeenCalledWith(true);
      expect(writes).toHaveLength(2);
      expect(writes[0].body).toEqual(writes[1].body);
      expect(result.recoveryCode).toBe(onRecoveryCode.mock.calls[0][0]);

      api.clear();
      await api.unlockWithRecoveryCode(
        result.encryptedUserKey,
        USER_ID,
        currentPublicKey,
        onRecoveryCode.mock.calls[0][0],
        false,
      );
      expect(api.isActive()).toBe(true);
    },
    15000,
  );

  it('confirms sign-in before generating a replacement recovery code', async () => {
    await recoveryUnlock();
    const onRecoveryCode = vi.fn(async () => {});
    const cancel = vi.fn(async () => {
      throw new DOMException('Cancelled', 'AbortError');
    });

    await expect(
      api.rewrapUserKey(bundle, { rotateRecoveryCode: true, repairShare: false }, onRecoveryCode, cancel),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(onRecoveryCode).not.toHaveBeenCalled();
    expect(api.isActive()).toBe(true);
    expect(requests.some((request) => request.path.endsWith('/wraps'))).toBe(false);
  });

  it.each(['initialize', 'reset', 'rewrap'] as const)(
    'delivers and confirms recovery before %s writes, even if the committed write cannot be read back',
    async (operation) => {
      let shownCode = '';
      let confirm!: () => void;
      const confirmation = new Promise<void>((resolve) => {
        confirm = resolve;
      });
      const onRecoveryCode = vi.fn(async (code: string) => {
        shownCode = code;

        await confirmation;
      });

      if (operation === 'initialize') {
        keyless = true;
      } else if (operation === 'rewrap') {
        await recoveryUnlock();
      }

      readBackStatus = 503;

      let pending: Promise<unknown>;

      if (operation === 'initialize') {
        pending = api.initializeUserKey(USER_ID, PASSWORD, false, onRecoveryCode);
      } else if (operation === 'reset') {
        pending = api.resetUserKey(USER_ID, bundle, PASSWORD, false, onRecoveryCode, confirmFreshAuth);
      } else {
        pending = api.rewrapUserKey(
          bundle,
          { rotateRecoveryCode: true, repairShare: false },
          onRecoveryCode,
          confirmFreshAuth,
        );
      }

      const rejected = expect(pending).rejects.toThrow('(503)');

      await vi.waitFor(() => expect(onRecoveryCode).toHaveBeenCalledOnce(), { timeout: 10000 });

      expect(shownCode).not.toBe('');
      expect(requests.some((request) => request.path.includes('/encryption-key-bundle'))).toBe(false);

      confirm();

      await rejected;

      expect(requests.filter((request) => request.path.includes('/encryption-key-bundle'))).toHaveLength(1);
      await api.unlockWithRecoveryCode(bundle, USER_ID, currentPublicKey, shownCode, false);

      expect(api.isActive()).toBe(true);
    },
    15000,
  );

  it('does not save a bundle when recovery confirmation is cancelled', async () => {
    keyless = true;

    await expect(
      api.initializeUserKey(USER_ID, PASSWORD, false, async () => {
        throw new Error('Recovery setup cancelled');
      }),
    ).rejects.toThrow('cancelled');

    expect(keyless).toBe(true);
    expect(requests.some((request) => request.path.includes('/encryption-key-bundle'))).toBe(false);
    expect(api.isActive()).toBe(false);
  }, 15000);

  it('preserves authoritative auth failure when read-back follows an ambiguous write', async () => {
    await recoveryUnlock();

    lostWriteResponse = true;
    readBackStatus = 401;

    await expect(
      api.rewrapUserKey(bundle, { rotateRecoveryCode: true, repairShare: false }, async () => {}, confirmFreshAuth),
    ).rejects.toMatchObject({ name: 'UnlockApiError', status: 401 });
  });

  it('cancels a pending recovery screen on clear without waiting for UI confirmation or writing the bundle', async () => {
    keyless = true;
    const onRecoveryCode = vi.fn(() => new Promise<void>(() => {}));
    const pending = api.initializeUserKey(USER_ID, PASSWORD, false, onRecoveryCode);
    const rejected = expect(pending).rejects.toThrow('cleared');

    await vi.waitFor(() => expect(onRecoveryCode).toHaveBeenCalledOnce(), { timeout: 10000 });

    api.clear();

    await rejected;

    expect(keyless).toBe(true);
    expect(requests.some((request) => request.path.includes('/encryption-key-bundle'))).toBe(false);
    expect(api.isActive()).toBe(false);
  }, 15000);

  it('unlocks without enrolling when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const result = await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);

    expect(result.rememberedDevice).toBe('unavailable');
    expect(api.isActive()).toBe(true);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(false);
  });

  it('opens storage before enrollment and skips remembering if it cannot be read', async () => {
    vi.spyOn(RememberedDeviceStore.prototype, 'load').mockRejectedValueOnce(new Error('Storage blocked'));

    const result = await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);

    expect(result.rememberedDevice).toBe('unavailable');
    expect(api.isActive()).toBe(true);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(false);
  });

  it.each([false, true])('keeps a valid unlock and reports failed device cleanup: %s', async (cleanupFails) => {
    vi.spyOn(RememberedDeviceStore.prototype, 'save').mockRejectedValueOnce(new Error('Quota exceeded'));

    deviceCleanupStatus = cleanupFails ? 503 : 200;

    const result = await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);

    expect(result.rememberedDevice).toBe(cleanupFails ? 'cleanup_failed' : 'unavailable');
    expect(api.isActive()).toBe(true);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(true);

    expect(requests.some((request) => request.method === 'DELETE' && request.path.endsWith(DEVICE_ID))).toBe(true);
  });

  it('does not turn auth loss during enrollment into a successful unlock', async () => {
    deviceStatus = 401;

    await expect(
      api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true),
    ).rejects.toThrow('(401)');
    expect(api.isActive()).toBe(false);
  });

  it.each([401, 403])('does not turn auth loss during device cleanup into a successful unlock: %s', async (status) => {
    vi.spyOn(RememberedDeviceStore.prototype, 'save').mockRejectedValueOnce(new Error('Quota exceeded'));

    deviceCleanupStatus = status;

    await expect(
      api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true),
    ).rejects.toThrow(`(${status})`);
    expect(api.isActive()).toBe(false);
  });

  it('reports unknown cleanup when the enrollment response is lost', async () => {
    lostEnrollmentResponse = true;

    const result = await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);

    expect(result.rememberedDevice).toBe('cleanup_failed');
    expect(api.isActive()).toBe(true);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(true);
    expect(requests.some((request) => request.method === 'DELETE')).toBe(false);
  });

  it('passes the previous device ID when replacing a remembered record', async () => {
    await rememberFixture();

    const result = await api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);

    expect(result.rememberedDevice).toBe('remembered');
    expect(requests.find((request) => request.path.endsWith('/devices'))?.body?.previousDeviceId).toBe(DEVICE_ID);
  });

  it('does not expose the internal key store through Comlink property traversal', async () => {
    await recoveryUnlock();

    const channel = new MessageChannel();

    expose(api, channel.port1);

    const remote = wrap<{ ready(): true }>(channel.port2);
    const probe = remote as unknown as {
      userSession: { keys: { getUnlockKey(): Promise<Uint8Array> } };
      orgVault: { session: { keys: { getUnlockKey(): Promise<Uint8Array> } } };
    };

    try {
      expect(await remote.ready()).toBe(true);
      await expect(probe.userSession.keys.getUnlockKey()).rejects.toThrow();
      await expect(probe.orgVault.session.keys.getUnlockKey()).rejects.toThrow();
    } finally {
      remote[releaseProxy]();
      channel.port1.close();
      channel.port2.close();
    }
  });

  it('unlocks with a password only after matching the coherent share snapshot', async () => {
    await api.unlockWithPassword(bundle, USER_ID, fixture.publicKey, PASSWORD, false);

    expect(api.isActive()).toBe(true);
    expect(requests.map((request) => request.path)).toEqual(['/v1/users/key-share']);
  });

  it('uses only the protected search root for all four digest families', async () => {
    await recoveryUnlock();

    const access = await vaultFixture();
    const fieldId = OTHER_USER_ID;

    expect(await api.hashTagLabel(ORG_ID, access, '  Senior  ')).toBe(hashTagLabel(SEARCH_KEY, '  Senior  '));
    expect(await api.hashTagLabel(ORG_ID, access, 'Senior')).not.toBe(hashTagLabel(TEST_KEYS.bob.privateKey, 'Senior'));
    expect(await api.hashCustomFieldValue(ORG_ID, access, fieldId, 'yes_no', true)).toBe(
      hashCustomFieldValue(SEARCH_KEY, ORG_ID, fieldId, 'yes_no', true),
    );
    expect(await api.hashCandidateProfileSearchValue(ORG_ID, access, 'email', 'A@EXAMPLE.COM')).toBe(
      hashCandidateProfileSearchValue(SEARCH_KEY, ORG_ID, 'email', 'A@EXAMPLE.COM'),
    );
    expect(await api.hashCategoricalFormFieldValue(ORG_ID, access, fieldId, 'boolean', true)).toBe(
      hashCategoricalFormFieldValue(SEARCH_KEY, ORG_ID, fieldId, 'boolean', true),
    );
    await expect(api.hashTagLabel(ORG_ID, { ...access, recipientKeyVersion: 2 }, 'Senior')).rejects.toThrow('identity');
    await expect(
      api.hashTagLabel(ORG_ID, { ...access, vaultPublicKey: TEST_KEYS.charlie.publicKey }, 'Senior'),
    ).rejects.toThrow('does not match');
  });

  it('rejects unavailable user or vault generations instead of trying the current key', async () => {
    await recoveryUnlock();

    const email = await encryptEmailContent({ text: 'Hello' }, emailContext, [
      orgVaultRecipient(TEST_KEYS.bob.publicKey, 1),
      applicantRecipient(fixture.publicKey, 2),
    ]);

    await expect(api.decryptEmailContentForApplicant(email, emailContext)).rejects.toThrow('generation is unavailable');

    const access = await vaultFixture();
    const changed = {
      ...email,
      keys: email.keys.map((key) => (key.recipient === 'org_vault' ? { ...key, rkv: 2 } : key)),
    };

    await expect(api.decryptEmailContentForOrganization(changed, ORG_ID, access, emailContext)).rejects.toThrow(
      'generation is unavailable',
    );
  });

  it('gets each new remembered unlock key from the server and keeps the local record after auth loss', async () => {
    await rememberFixture();

    expect(await api.tryUnlockWithRememberedDevice(bundle, USER_ID, fixture.publicKey)).toBe(true);

    api.clear();
    deviceStatus = 401;

    await expect(api.tryUnlockWithRememberedDevice(bundle, USER_ID, fixture.publicKey)).rejects.toThrow('(401)');
    expect(storage.size).toBe(1);
    expect(api.isActive()).toBe(false);

    deviceStatus = 200;

    expect(await api.tryUnlockWithRememberedDevice(bundle, USER_ID, fixture.publicKey)).toBe(true);
    expect(requests.filter((request) => request.path.endsWith('/key'))).toHaveLength(3);
  });

  it('cannot revive a revoked/expired device with login alone', async () => {
    await rememberFixture();

    deviceStatus = 410;

    expect(await api.tryUnlockWithRememberedDevice(bundle, USER_ID, fixture.publicKey)).toBe(false);
    expect(api.isActive()).toBe(false);
    expect(storage.size).toBe(0);
  });

  it('does not publish a password unlock completed after clear', async () => {
    const pending = api.unlockWithPassword(bundle, USER_ID, fixture.publicKey, PASSWORD, false);

    await vi.waitFor(() => {
      expect(requests).toHaveLength(1);
    });

    api.clear();

    await expect(pending).rejects.toThrow('cleared');
    expect(api.isActive()).toBe(false);
  });

  it('saves, reads back and decrypts the persisted bundle before completing setup/enrolling a device', async () => {
    keyless = true;

    const result = await api.initializeUserKey(USER_ID, PASSWORD, true, async () => {});

    expect(api.isActive()).toBe(true);
    expect(result.recoveryCode).toMatch(/^[A-Z0-9-]+$/);
    expect(result).not.toHaveProperty('unlockKey');
    expect(result).not.toHaveProperty('keyAuthSecret');
    expect(requests.map((request) => request.path)).toEqual([
      '/v1/users/key-share',
      '/v1/users/encryption-key-bundle',
      '/v1/auth/bootstrap',
      '/v1/users/key-share',
      '/v1/users/devices',
    ]);
    expect(Object.keys(requests[1].body ?? {}).sort()).toEqual([
      'encryptedUserKey',
      'keyAuthSecret',
      'publicKey',
      'userId',
    ]);
    expect(requests[1].body?.userId).toBe(USER_ID);
    expect(storage.size).toBe(1);
  }, 15000);

  it('initializes without recovery and adds the first recovery kit to the same identity later', async () => {
    keyless = true;
    const initial = await api.initializeUserKey(USER_ID, PASSWORD, true);

    expect(initial.recoveryCode).toBeUndefined();
    expect(initial.encryptedUserKey.wraps.map((wrap) => wrap.method)).toEqual(['password']);
    expect(api.isActive()).toBe(true);

    const confirmRecovery = vi.fn(async () => {});
    const updated = await api.rewrapUserKey(
      initial.encryptedUserKey,
      { rotateRecoveryCode: true, repairShare: false },
      confirmRecovery,
      confirmFreshAuth,
    );

    expect(confirmRecovery).toHaveBeenCalledOnce();
    expect(updated.encryptedUserKey.pk).toEqual(initial.encryptedUserKey.pk);
    expect(updated.encryptedUserKey.wraps.map((wrap) => wrap.method)).toEqual(['password', 'recovery_code']);
    api.clear();
    await api.unlockWithRecoveryCode(
      updated.encryptedUserKey,
      USER_ID,
      initial.publicKey,
      updated.recoveryCode ?? '',
      false,
    );
    expect(api.isActive()).toBe(true);
  }, 15000);

  it('rejects another keyless account’s share before deriving or saving setup keys', async () => {
    keyless = true;
    shareUserId = OTHER_USER_ID;
    const confirmRecovery = vi.fn();

    await expect(api.initializeUserKey(USER_ID, PASSWORD, false, confirmRecovery)).rejects.toMatchObject({
      status: 409,
    });
    expect(confirmRecovery).not.toHaveBeenCalled();
    expect(requests.map((request) => request.path)).toEqual(['/v1/users/key-share']);
    expect(api.isActive()).toBe(false);
  });

  it('reconciles a committed setup after a lost response without generating or posting another identity', async () => {
    keyless = true;
    lostWriteResponse = true;

    const result = await api.initializeUserKey(USER_ID, PASSWORD, false, async () => {});

    expect(api.isActive()).toBe(true);
    expect(result.encryptedUserKey).toEqual(bundle);
    expect(requests.filter((request) => request.path.endsWith('/encryption-key-bundle'))).toHaveLength(1);
  }, 15000);

  it('does not finish setup or enroll a remembered device when read-back verification fails', async () => {
    keyless = true;
    brokenReadBack = true;

    await expect(api.initializeUserKey(USER_ID, PASSWORD, true, async () => {})).rejects.toThrow(
      'Saved user key bundle',
    );
    expect(api.isActive()).toBe(false);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(false);
    expect(storage.size).toBe(0);
  }, 15000);

  it('rewraps from an explicit remembered-device operation and repairs the share without exporting U', async () => {
    await rememberFixture();

    const newPassword = 'satellite apricot harbor glacier 91';
    const result = await api.rewrapWithRememberedDevice(
      bundle,
      USER_ID,
      fixture.publicKey,
      { password: newPassword, rotateRecoveryCode: true, repairShare: true },
      async () => {},
      confirmFreshAuth,
    );
    const mutation = requests.find((request) => request.path.endsWith('/wraps'));

    expect(result.encryptedUserKey.pk).toEqual(fixture.bundle.pk);
    expect(result.encryptedUserKey.keyVersion).toBe(1);
    expect(result.recoveryCode).not.toBeNull();
    expect(mutation?.body).toHaveProperty('keyAuthSecret');
    expect(mutation?.body).toHaveProperty('replacementKeyShare');
    expect(share).not.toBe(KEY_SHARE);
    expect(result).not.toHaveProperty('unlockKey');

    api.clear();

    await api.unlockWithPassword(result.encryptedUserKey, USER_ID, fixture.publicKey, newPassword, false);

    expect(api.isActive()).toBe(true);

    api.clear();

    if (result.recoveryCode === null) {
      throw new Error('Expected a rotated recovery code');
    }

    await api.unlockWithRecoveryCode(result.encryptedUserKey, USER_ID, fixture.publicKey, result.recoveryCode, false);

    expect(api.isActive()).toBe(true);
  }, 15000);

  it('cannot persist an in-flight enrollment after remembered access is forgotten', async () => {
    let releaseWrite!: () => void;
    let reachedWrite = false;
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });

    storageHooks.beforeWrite = async () => {
      reachedWrite = true;

      await writeGate;
    };

    const pending = api.unlockWithRecoveryCode(bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, true);
    const rejected = expect(pending).rejects.toThrow('cleared');

    await vi.waitFor(() => {
      expect(reachedWrite).toBe(true);
    });
    await api.forgetRememberedDevice(bundle, USER_ID, fixture.publicKey);

    releaseWrite();

    await rejected;

    expect(api.isActive()).toBe(false);
    expect(storage.size).toBe(0);
  });
});
