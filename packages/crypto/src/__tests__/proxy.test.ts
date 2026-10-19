import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPublicEncryptionKey, mockWrappedUserKey } from './crypto-helpers';
import { OTHER_USER_ID, USER_ID } from './unlock-fixtures';

const remote = vi.hoisted(() => ({
  unlockWithPassword: vi.fn(),
  unlockWithRecoveryCode: vi.fn(),
  tryUnlockWithRememberedDevice: vi.fn(),
  decryptEmailContentForApplicant: vi.fn(),
  clear: vi.fn(),
  logout: vi.fn(),
}));
const dispose = vi.hoisted(() => vi.fn());

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
  proxy = (await import('../proxy')).CryptoProxy;

  proxy.init('https://api.comitium.test/v1');
});

afterEach(async () => {
  await proxy.destroy();
});

describe('crypto facade lifecycle', () => {
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
    remote.logout.mockRejectedValue(new Error('server unavailable'));

    await expect(proxy.logout(true)).rejects.toThrow('server unavailable');
    expect(proxy.isActive()).toBe(false);
    expect(dispose).toHaveBeenCalled();
  });
});
