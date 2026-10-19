import { base64 } from '@scure/base';
import { expose, releaseProxy, wrap } from 'comlink';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashCandidateProfileSearchValue } from '../candidate-profile-search-hash';
import { hashCustomFieldValue } from '../custom-field-hash';
import { encryptEmailContent } from '../email-encryption';
import { hashCategoricalFormFieldValue } from '../form-field-search-hash';
import { applicantRecipient, orgVaultRecipient } from '../recipients';
import type { PublicEncryptionKey } from '../schemas';
import type { WrappedUserKey } from '../schemas/user-key';
import { createCryptoSessionIdentity } from '../session';
import { hashTagLabel } from '../tag-hash';
import { userKeyWrapsFingerprint } from '../user-key';
import { CryptoWorkerApi } from '../worker/crypto-api';
import { RememberedDeviceStore } from '../worker/remembered-device-store';
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

const DEVICE_KEY = new Uint8Array(32).fill(17);
const emailContext = { purpose: 'email_content' as const, orgId: ORG_ID, subjectId: OTHER_USER_ID, fieldId: 'message' };
let fixture: Awaited<ReturnType<typeof userKeyFixture>>;
let api: CryptoWorkerApi;
let bundle: WrappedUserKey;
let share: string;
let currentPublicKey: PublicEncryptionKey;
let keyless: boolean;
let deviceStatus: number;
let brokenReadBack: boolean;
let lostWriteResponse: boolean;
let requests: { path: string; method: string; body: Record<string, unknown> | null }[];

beforeAll(async () => {
  fixture = await userKeyFixture();
}, 15000);

beforeEach(() => {
  storage.clear();
  storageHooks.beforeWrite = undefined;
  vi.stubGlobal('indexedDB', {});
  bundle = structuredClone(fixture.bundle);
  share = KEY_SHARE;
  currentPublicKey = fixture.publicKey;
  keyless = false;
  deviceStatus = 200;
  brokenReadBack = false;
  lostWriteResponse = false;
  requests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, options: RequestInit) => {
      const path = new URL(input).pathname;
      const method = options.method ?? 'GET';
      const body = options.body ? (JSON.parse(String(options.body)) as Record<string, unknown>) : null;

      requests.push({ path, method, body });

      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');

      if (path.endsWith('/key-share')) {
        return Response.json({
          keyShare: share,
          version: 1,
          keyVersion: keyless ? null : bundle.keyVersion,
          wrapsFingerprint: keyless ? null : userKeyWrapsFingerprint(bundle.wraps),
        });
      }

      if (path.endsWith('/auth/session')) {
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

        return Response.json({ success: true });
      }

      if (path.endsWith('/devices') || path.endsWith('/key')) {
        return deviceStatus === 200
          ? Response.json({ deviceId: DEVICE_ID, serverDeviceKey: base64.encode(DEVICE_KEY) })
          : new Response(null, { status: deviceStatus });
      }

      return Response.json({ success: true });
    }),
  );
  api = new CryptoWorkerApi();

  api.configure('https://api.comitium.test/v1');
});

afterEach(() => {
  api.clear();
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

    const result = await api.initializeUserKey(USER_ID, PASSWORD, true);

    expect(api.isActive()).toBe(true);
    expect(result.recoveryCode).toMatch(/^[A-Z0-9-]+$/);
    expect(result).not.toHaveProperty('unlockKey');
    expect(result).not.toHaveProperty('keyAuthSecret');
    expect(requests.map((request) => request.path)).toEqual([
      '/v1/users/key-share',
      '/v1/users/encryption-key-bundle',
      '/v1/auth/session',
      '/v1/users/key-share',
      '/v1/users/devices',
    ]);
    expect(Object.keys(requests[1].body ?? {}).sort()).toEqual(['encryptedUserKey', 'keyAuthSecret', 'publicKey']);
    expect(storage.size).toBe(1);
  }, 15000);

  it('reconciles a committed setup after a lost response without generating or posting another identity', async () => {
    keyless = true;
    lostWriteResponse = true;

    const result = await api.initializeUserKey(USER_ID, PASSWORD, false);

    expect(api.isActive()).toBe(true);
    expect(result.encryptedUserKey).toEqual(bundle);
    expect(requests.filter((request) => request.path.endsWith('/encryption-key-bundle'))).toHaveLength(1);
  }, 15000);

  it('does not finish setup or enroll a remembered device when read-back verification fails', async () => {
    keyless = true;
    brokenReadBack = true;

    await expect(api.initializeUserKey(USER_ID, PASSWORD, true)).rejects.toThrow('Saved user key bundle');
    expect(api.isActive()).toBe(false);
    expect(requests.some((request) => request.path.endsWith('/devices'))).toBe(false);
    expect(storage.size).toBe(0);
  }, 15000);

  it('rewraps from an explicit remembered-device operation and repairs the share without exporting U', async () => {
    await rememberFixture();

    const newPassword = 'satellite apricot harbor glacier 91';
    const result = await api.rewrapWithRememberedDevice(bundle, USER_ID, fixture.publicKey, {
      password: newPassword,
      rotateRecoveryCode: true,
      repairShare: true,
    });
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

  it('forgets local keys on logout and reports a failed server logout as failure', async () => {
    await rememberFixture();
    await recoveryUnlock();

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(api.logout(false, { wrapped: bundle, userId: USER_ID, publicKey: fixture.publicKey })).rejects.toThrow(
      '(503)',
    );
    expect(api.isActive()).toBe(false);
    expect(storage.size).toBe(0);
  });

  it('cannot persist an in-flight remembered-device enrollment after explicit logout', async () => {
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
    await api.logout(false, { wrapped: bundle, userId: USER_ID, publicKey: fixture.publicKey });

    releaseWrite();

    await rejected;

    expect(api.isActive()).toBe(false);
    expect(storage.size).toBe(0);
  });
});
