import '../worker/unlock-api-error-transport';

import { expose, proxy, releaseProxy, wrap } from 'comlink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoWorkerApi } from '../worker/crypto-api';
import { UnlockApiError } from '../worker/unlock-api-error';
import { mockPublicEncryptionKey, mockWrappedUserKey } from './crypto-helpers';
import { KEY_SHARE, PASSWORD, USER_ID, userKeyFixture } from './unlock-fixtures';

let api: CryptoWorkerApi;
let remote: ReturnType<typeof wrap<CryptoWorkerApi>>;
let channel: MessageChannel;

beforeEach(() => {
  api = new CryptoWorkerApi();
  api.configure('https://api.comitium.test/v1');
  channel = new MessageChannel();

  expose(api, channel.port1);

  remote = wrap<CryptoWorkerApi>(channel.port2);
});

afterEach(() => {
  api.clear();
  remote[releaseProxy]();
  channel.port1.close();
  channel.port2.close();
  vi.unstubAllGlobals();
});

describe('safe unlock API errors across Comlink', () => {
  it.each([
    { failure: new DOMException('Cancelled', 'AbortError'), expected: { name: 'AbortError' } },
    { failure: new UnlockApiError(503), expected: { status: 503, code: 'API_ERROR' } },
  ])(
    'preserves confirmation callback failure without generating a code: $failure.name',
    async ({ failure, expected }) => {
      const fixture = await userKeyFixture();
      await remote.unlockWithRecoveryCode(fixture.bundle, USER_ID, fixture.publicKey, fixture.recoveryCode, false);

      const showCode = vi.fn(async () => {});
      const confirm = async () => {
        throw failure;
      };

      await expect(
        remote.rewrapUserKey(
          fixture.bundle,
          { rotateRecoveryCode: true, repairShare: false },
          proxy(showCode),
          proxy(confirm),
        ),
      ).rejects.toMatchObject(expected);
      expect(showCode).not.toHaveBeenCalled();
      await expect(remote.isActive()).resolves.toBe(true);
    },
  );

  it.each([
    { status: 503, code: 'KEY_SHARE_UNAVAILABLE', expectedCode: 'KEY_SHARE_UNAVAILABLE' },
    { status: 403, code: 'FRESH_AUTHENTICATION_REQUIRED', expectedCode: 'FRESH_AUTHENTICATION_REQUIRED' },
    { status: 403, code: 'UNRECOGNIZED_SERVER_CODE', expectedCode: 'API_ERROR' },
  ])('preserves status and allowlisted error code: $code', async ({ status, code, expectedCode }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code, message: 'Do not propagate this response', details: { private: 'sensitive' } } },
          { status },
        ),
      ),
    );

    const error = await remote
      .unlockWithPassword(mockWrappedUserKey(), USER_ID, mockPublicEncryptionKey(), PASSWORD, false)
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(UnlockApiError);
    expect(error).toMatchObject({ status, code: expectedCode });
    expect(String(error)).not.toContain('Do not propagate');
    expect(JSON.stringify(error)).not.toContain('sensitive');
  });

  it('preserves ordinary transport failures without classifying them as an API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Synthetic network failure');
      }),
    );

    const error = await remote
      .unlockWithPassword(mockWrappedUserKey(), USER_ID, mockPublicEncryptionKey(), PASSWORD, false)
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnlockApiError);
    expect(error).toMatchObject({ name: 'TypeError', message: 'Synthetic network failure' });
  });

  it('waits for the real Comlink recovery callback before posting and preserves the displayed code after read-back failure', async () => {
    let posted = false;
    let shownCode = '';
    let confirm!: () => void;
    const confirmation = new Promise<void>((resolve) => {
      confirm = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input.endsWith('/key-share')) {
          return Response.json({
            userId: USER_ID,
            keyShare: KEY_SHARE,
            version: 1,
            keyVersion: null,
            wrapsFingerprint: null,
          });
        }

        if (input.endsWith('/encryption-key-bundle')) {
          posted = true;

          expect(shownCode).not.toBe('');

          return Response.json({ success: true });
        }

        return new Response(null, { status: 503 });
      }),
    );

    const onRecoveryCode = vi.fn(async (code: string) => {
      shownCode = code;

      await confirmation;
    });
    const pending = remote.initializeUserKey(USER_ID, PASSWORD, false, proxy(onRecoveryCode));
    const rejected = expect(pending).rejects.toMatchObject({ status: 503 });

    await vi.waitFor(() => expect(onRecoveryCode).toHaveBeenCalledOnce(), { timeout: 10000 });

    expect(posted).toBe(false);

    confirm();

    await rejected;

    expect(posted).toBe(true);
    expect(shownCode).not.toBe('');
  }, 15000);
});
