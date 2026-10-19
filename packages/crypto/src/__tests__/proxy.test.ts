import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPublicEncryptionKey, mockWrappedUserKey } from './crypto-helpers';
import { OTHER_USER_ID, USER_ID } from './unlock-fixtures';

const remote = vi.hoisted(() => ({
  unlockWithPassword: vi.fn(),
  verifyPassword: vi.fn(),
  unlockWithRecoveryCode: vi.fn(),
  tryUnlockWithRememberedDevice: vi.fn(),
  decryptEmailContentForApplicant: vi.fn(),
  clear: vi.fn(),
}));
const dispose = vi.hoisted(() => vi.fn());
const deviceStore = vi.hoisted(() => ({ load: vi.fn(), forgetAll: vi.fn() }));

vi.mock('../remembered-device-store', () => ({
  RememberedDeviceStore: class {
    load = deviceStore.load;
    forgetAll = deviceStore.forgetAll;
  },
}));

vi.mock('../worker/crypto-worker-client', () => ({
  CryptoWorkerClient: class {
    run<T>(operation: (api: typeof remote) => Promise<T>): Promise<T> {
      return Promise.resolve().then(() => operation(remote));
    }

    dispose = dispose;
  },
}));

let proxy: typeof import('../proxy').CryptoProxy;
const bundle = mockWrappedUserKey();
const publicKey = mockPublicEncryptionKey();

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  remote.unlockWithPassword.mockResolvedValue({ rememberedDevice: 'not_requested' });
  remote.unlockWithRecoveryCode.mockResolvedValue({ rememberedDevice: 'not_requested' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true })));
  proxy = (await import('../proxy')).CryptoProxy;

  proxy.init('https://api.comitium.test/v1');
});

afterEach(async () => {
  await proxy.destroy();
  vi.unstubAllGlobals();
});

describe('crypto facade lifecycle', () => {
  it('does not close an active session when password verification fails', async () => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);
    remote.verifyPassword.mockRejectedValue(new DOMException('Invalid password', 'OperationError'));

    await expect(proxy.verifyPassword(bundle, USER_ID, publicKey, 'incorrect password')).rejects.toThrow();
    expect(proxy.isActiveFor(bundle, USER_ID)).toBe(true);
    expect(remote.clear).not.toHaveBeenCalled();
  });

  it('revokes the stored device and session after the Worker has already been reset', async () => {
    deviceStore.load.mockResolvedValue({ deviceId: '0199a000-0000-7000-8000-000000000004' });
    proxy.reset();

    await proxy.logout(false, { wrapped: bundle, userId: USER_ID, publicKey });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.comitium.test/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ deviceId: '0199a000-0000-7000-8000-000000000004' }),
      }),
    );
    expect(deviceStore.forgetAll).toHaveBeenCalledOnce();
    expect(proxy.isActive()).toBe(false);
  });

  it('still revokes authentication when local device metadata cannot be read, and reports incomplete cleanup', async () => {
    deviceStore.load.mockRejectedValue(new Error('Storage blocked'));

    await expect(proxy.logout(false, { wrapped: bundle, userId: USER_ID, publicKey })).rejects.toThrow(
      'Storage blocked',
    );
    expect(fetch).toHaveBeenCalledWith('https://api.comitium.test/v1/auth/logout', expect.any(Object));
    expect(deviceStore.forgetAll).toHaveBeenCalledOnce();
  });

  it('does not clear active keys when reset sign-in confirmation is cancelled', async () => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);
    const cancel = async () => {
      throw new DOMException('Cancelled', 'AbortError');
    };

    await expect(
      proxy.resetUserKey(USER_ID, bundle, 'new password', false, async () => {}, cancel),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(proxy.isActiveFor(bundle, USER_ID)).toBe(true);
    expect(remote.clear).not.toHaveBeenCalled();
  });

  it('rejects an overlapping credential attempt instead of returning another attempt’s result', async () => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);

    let complete!: () => void;

    remote.unlockWithPassword.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );

    const first = proxy.unlockWithPassword(bundle, USER_ID, publicKey, 'first password', false);

    await expect(proxy.unlockWithPassword(bundle, USER_ID, publicKey, 'corrected password', false)).rejects.toThrow(
      'already in progress',
    );
    await vi.waitFor(() => expect(remote.unlockWithPassword).toHaveBeenCalledOnce());

    complete();
    await first;

    await proxy.unlockWithPassword(bundle, USER_ID, publicKey, 'corrected password', false);

    expect(remote.unlockWithPassword).toHaveBeenCalledTimes(2);
    expect(proxy.isActiveFor(bundle, USER_ID)).toBe(true);
  });

  it('clears old Worker state before publishing another account', async () => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);
    await proxy.unlockWithRecoveryCode(bundle, OTHER_USER_ID, publicKey, 'code', false);

    expect(remote.clear).toHaveBeenCalled();
    expect(proxy.isActiveFor(bundle, USER_ID)).toBe(false);
    expect(proxy.isActiveFor(bundle, OTHER_USER_ID)).toBe(true);
  });

  it('does not publish an unlock completed after clear/reset', async () => {
    let complete!: () => void;
    remote.unlockWithPassword.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const pending = proxy.unlockWithPassword(bundle, USER_ID, publicKey, 'password', false);

    await vi.waitFor(() => {
      expect(remote.unlockWithPassword).toHaveBeenCalled();
    });
    await proxy.clear();

    complete();

    await expect(pending).rejects.toThrow('cleared');
    expect(proxy.isActive()).toBe(false);
  });

  it('publishes no active identity when a remembered unlock is unavailable', async () => {
    remote.tryUnlockWithRememberedDevice.mockResolvedValue(false);

    expect(await proxy.tryUnlockWithRememberedDevice(bundle, USER_ID, publicKey)).toBe(false);
    expect(proxy.isActive()).toBe(false);
  });

  it.each(['clear', 'reset', 'destroy'] as const)('rejects a decrypt completed after %s', async (operation) => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);

    let complete!: (value: unknown) => void;

    remote.decryptEmailContentForApplicant.mockImplementation(
      () =>
        new Promise<unknown>((resolve) => {
          complete = resolve;
        }),
    );

    const context = { purpose: 'email_content' as const, orgId: USER_ID, subjectId: OTHER_USER_ID, fieldId: 'body' };
    const pending = proxy.decryptEmailContentForApplicant(
      { v: 1, purpose: 'email_content', zip: 'none', ct: 'AQIDBA==', iv: 'AAAAAAAAAAAAAAAA', keys: [] },
      context,
    );

    await vi.waitFor(() => {
      expect(remote.decryptEmailContentForApplicant).toHaveBeenCalled();
    });
    await proxy[operation]();

    complete({ body: 'Sensitive message' });

    await expect(pending).rejects.toThrow('cleared');
    expect(proxy.isActive()).toBe(false);
  });

  it('clears local state and terminates even when server logout fails', async () => {
    await proxy.unlockWithRecoveryCode(bundle, USER_ID, publicKey, 'code', false);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(proxy.logout(true)).rejects.toThrow('(503)');
    expect(proxy.isActive()).toBe(false);
    expect(dispose).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('https://api.comitium.test/v1/users/devices/revoke-all', expect.any(Object));
    expect(deviceStore.forgetAll).toHaveBeenCalledOnce();
  });
});
