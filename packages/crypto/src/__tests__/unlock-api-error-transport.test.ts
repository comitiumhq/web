import '../worker/unlock-api-error-transport';

import { expose, proxy, releaseProxy, wrap } from 'comlink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoWorkerApi } from '../worker/crypto-api';
import { UnlockApiError } from '../worker/unlock-api-error';
import { mockPublicEncryptionKey, mockWrappedUserKey } from './crypto-helpers';
import { KEY_SHARE, PASSWORD, USER_ID } from './unlock-fixtures';

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
  it.each(['KEY_SHARE_UNAVAILABLE', 'UNRECOGNIZED_SERVER_CODE'])(
    'preserves status and allowlisted error code: %s',
    async (code) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          Response.json(
            { error: { code, message: 'Do not propagate this response', details: { private: 'sensitive' } } },
            { status: 503 },
          ),
        ),
      );

      const error = await remote
        .unlockWithPassword(mockWrappedUserKey(), USER_ID, mockPublicEncryptionKey(), PASSWORD, false)
        .catch((value: unknown) => value);

      expect(error).toBeInstanceOf(UnlockApiError);
      expect(error).toMatchObject({ status: 503, code: code === 'KEY_SHARE_UNAVAILABLE' ? code : 'API_ERROR' });
      expect(String(error)).not.toContain('Do not propagate');
      expect(JSON.stringify(error)).not.toContain('sensitive');
    },
  );

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
          return Response.json({ keyShare: KEY_SHARE, version: 1, keyVersion: null, wrapsFingerprint: null });
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
