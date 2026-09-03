import type { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WrappedKey } from '../envelope-key';
import { createEncryptionUnlockMessage, type SignMessageFn } from '../proxy';
import type { RecipientDescriptor } from '../recipients';
import { mockPublicEncryptionKey, mockWrappedKey, mockWrappedPersonalKey } from './crypto-helpers';

type ComlinkModule = typeof import('comlink');
type CryptoProxyFacade = typeof import('../proxy').CryptoProxy;
type MockFunction = ReturnType<typeof vi.fn>;
type MockProxy = Record<string | symbol, MockFunction>;

// ---- Mock comlink ----

vi.mock('comlink', () => {
  const releaseProxy = Symbol('releaseProxy');

  return {
    wrap: vi.fn(),
    transfer: vi.fn((data: unknown) => data),
    releaseProxy,
  };
});

// ---- Worker mock (class-based, constructable) ----

interface MockWorkerInstance {
  terminate: ReturnType<typeof vi.fn>;
}

let workerInstances: MockWorkerInstance[] = [];

// ---- Helpers ----

function mockSignMessage(sig = '0xsig'): SignMessageFn {
  return vi.fn().mockResolvedValue(sig);
}

function mockGetUserKeyShare() {
  return vi.fn().mockResolvedValue({ keyShare: 'key-share', version: 1 });
}

function mockEncryptedKey() {
  return mockWrappedPersonalKey();
}

function mockVaultKey(overrides?: Partial<WrappedKey>): WrappedKey {
  return mockWrappedKey(overrides);
}

const TEST_CONTEXT = {
  purpose: 'application_answers' as const,
  orgId: 'org-1',
  subjectId: 'subject-1',
  fieldId: 'field-1',
};
const TEST_ADDRESS = '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD' as Address;
const TEST_PUBLIC_KEY = mockPublicEncryptionKey();
const OTHER_PUBLIC_KEY = mockPublicEncryptionKey('33'.repeat(32));
const STABLE_SIGNATURE = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b`;
const OTHER_STABLE_SIGNATURE = `0x${'33'.repeat(32)}${'44'.repeat(32)}1b`;
const TEST_UNLOCK_MESSAGE = [
  'Comitium encryption unlock',
  '',
  'Key namespace: comitium.personal-key-wrapping',
  `Wallet: ${TEST_ADDRESS.toLowerCase()}`,
  '',
  'This signature unlocks your encrypted personal key.',
  'It does not authorize a blockchain transaction or server action.',
].join('\n');

// ---- Tests ----

describe('CryptoProxy', () => {
  describe('browser environment', () => {
    let CryptoProxy: CryptoProxyFacade;
    let mockProxy: MockProxy;
    let Comlink: ComlinkModule;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();

      workerInstances = [];

      // Use a class-based Worker mock (arrow functions are not constructable)
      vi.stubGlobal(
        'Worker',
        class MockWorker {
          terminate = vi.fn();

          constructor(..._args: unknown[]) {
            workerInstances.push(this);
          }
        },
      );

      // Re-import comlink to get fresh mock after resetModules
      Comlink = await import('comlink');

      mockProxy = {
        unlock: vi.fn(),
        tryUnlockWithRememberedDevice: vi.fn().mockResolvedValue(false),
        isActive: vi.fn(),
        clear: vi.fn(),
        encryptApplication: vi.fn(),
        decryptApplication: vi.fn(),
        encryptFile: vi.fn(),
        encryptFileWithOverlays: vi.fn(),
        decryptFile: vi.fn(),
        encryptEmailContent: vi.fn(),
        encryptEmailContentWithOverlays: vi.fn(),
        decryptEmailContentForOrganization: vi.fn(),
        decryptEmailContentForApplicant: vi.fn(),
        generateAndWrapPersonalKey: vi.fn(),
        generateAndWrapVaultKey: vi.fn(),
        grantVaultAccess: vi.fn(),
        hashTagLabel: vi.fn(),
        hashCustomFieldValue: vi.fn(),
        [Comlink.releaseProxy]: vi.fn(),
      };

      (Comlink.wrap as ReturnType<typeof vi.fn>).mockReturnValue(mockProxy);

      // Re-import proxy module for fresh state
      const mod = await import('../proxy');
      CryptoProxy = mod.CryptoProxy;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // --- Worker lifecycle ---

    describe('init', () => {
      it('creates Worker and wraps with Comlink', () => {
        CryptoProxy.init();

        expect(workerInstances).toHaveLength(1);
        expect(Comlink.wrap).toHaveBeenCalledTimes(1);
      });

      it('does not create Worker twice', () => {
        CryptoProxy.init();
        CryptoProxy.init();

        expect(workerInstances).toHaveLength(1);
      });
    });

    describe('lazy initialization', () => {
      it('creates Worker on first method call', async () => {
        mockProxy.encryptApplication.mockResolvedValue({});

        await CryptoProxy.encryptApplication(TEST_PUBLIC_KEY, 1, {}, TEST_CONTEXT);

        expect(workerInstances).toHaveLength(1);
      });

      it('all method calls share the same Worker', async () => {
        mockProxy.encryptApplication.mockResolvedValue({});
        mockProxy.encryptEmailContent.mockResolvedValue({});
        const recipients: RecipientDescriptor[] = [
          { recipient: 'org_vault', publicKey: TEST_PUBLIC_KEY, keyVersion: 1 },
        ];

        await CryptoProxy.encryptApplication(TEST_PUBLIC_KEY, 1, {}, TEST_CONTEXT);
        await CryptoProxy.encryptEmailContent({}, TEST_CONTEXT, recipients);

        expect(workerInstances).toHaveLength(1);
      });
    });

    // --- Signature management ---

    describe('ensureSignature', () => {
      it('calls signMessage with address-bound encryption unlock message', async () => {
        const sign = mockSignMessage('0xsig');

        await CryptoProxy.ensureSignature(sign, TEST_ADDRESS);

        expect(sign).toHaveBeenCalledWith(TEST_UNLOCK_MESSAGE);
      });

      it('renders the canonical encryption unlock message', () => {
        const message = createEncryptionUnlockMessage(TEST_ADDRESS);

        expect(message).toBe(TEST_UNLOCK_MESSAGE);
      });

      it('does not cache signature — each call triggers signMessage', async () => {
        const sign = mockSignMessage('0xsig');

        await CryptoProxy.ensureSignature(sign, TEST_ADDRESS);
        const sig2 = await CryptoProxy.ensureSignature(sign, TEST_ADDRESS);

        expect(sign).toHaveBeenCalledTimes(2);
        expect(sig2).toBe('0xsig');
      });

      it('deduplicates concurrent calls — only one wallet popup', async () => {
        let resolveSign!: (sig: string) => void;
        const sign = vi.fn().mockImplementation(
          () =>
            new Promise<string>((resolve) => {
              resolveSign = resolve;
            }),
        );

        const p1 = CryptoProxy.ensureSignature(sign, TEST_ADDRESS);
        const p2 = CryptoProxy.ensureSignature(sign, TEST_ADDRESS);

        resolveSign('0xdedup');

        const [r1, r2] = await Promise.all([p1, p2]);

        expect(r1).toBe('0xdedup');
        expect(r2).toBe('0xdedup');
        expect(sign).toHaveBeenCalledTimes(1);
      });

      it('cleans up on failure and allows retry', async () => {
        const sign = vi.fn().mockRejectedValueOnce(new Error('user rejected')).mockResolvedValueOnce('0xretry');

        await expect(CryptoProxy.ensureSignature(sign, TEST_ADDRESS)).rejects.toThrow('user rejected');

        const sig = await CryptoProxy.ensureSignature(sign, TEST_ADDRESS);

        expect(sig).toBe('0xretry');
        expect(sign).toHaveBeenCalledTimes(2);
      });

      it('concurrent callers both receive error on failure', async () => {
        let rejectSign!: (err: Error) => void;
        const sign = vi.fn().mockImplementation(
          () =>
            new Promise<string>((_, reject) => {
              rejectSign = reject;
            }),
        );

        const p1 = CryptoProxy.ensureSignature(sign, TEST_ADDRESS);
        const p2 = CryptoProxy.ensureSignature(sign, TEST_ADDRESS);

        rejectSign(new Error('popup closed'));

        await expect(p1).rejects.toThrow('popup closed');
        await expect(p2).rejects.toThrow('popup closed');
      });

      it('checks canonical signature byte stability for a wallet provider', async () => {
        const sign = vi.fn().mockResolvedValueOnce(STABLE_SIGNATURE).mockResolvedValueOnce(STABLE_SIGNATURE);

        const result = await CryptoProxy.checkSignatureStability(sign, TEST_ADDRESS, 'privy');

        expect(sign).toHaveBeenCalledTimes(2);
        expect(result).toMatchObject({
          providerId: 'privy',
          address: TEST_ADDRESS.toLowerCase(),
          stable: true,
        });
        expect(result.messageHash).toMatch(/^0x[0-9a-f]{64}$/);
        expect(result.firstSignatureHash).toMatch(/^0x[0-9a-f]{64}$/);
        expect(result.firstSignatureHash).toBe(result.secondSignatureHash);
        expect(result.firstSignatureHash).not.toBe(STABLE_SIGNATURE);
        expect(JSON.stringify(result)).not.toContain(STABLE_SIGNATURE);
      });

      it('reports unstable canonical signature bytes', async () => {
        const sign = vi.fn().mockResolvedValueOnce(STABLE_SIGNATURE).mockResolvedValueOnce(OTHER_STABLE_SIGNATURE);

        const result = await CryptoProxy.checkSignatureStability(sign, TEST_ADDRESS, 'cdp');

        expect(result.stable).toBe(false);
        expect(result.firstSignatureHash).not.toBe(result.secondSignatureHash);
      });
    });

    // --- Unlock ---

    describe('unlock', () => {
      it('gets signature and delegates to Worker', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        const sign = mockSignMessage('0xsig');
        const encryptedKey = mockEncryptedKey();
        const getUserKeyShare = mockGetUserKeyShare();

        await CryptoProxy.unlock(sign, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, getUserKeyShare);

        expect(sign).toHaveBeenCalledTimes(1);
        expect(sign).toHaveBeenCalledWith(createEncryptionUnlockMessage('0xaddr'));
        expect(getUserKeyShare).toHaveBeenCalledOnce();
        expect(mockProxy.tryUnlockWithRememberedDevice).toHaveBeenCalledWith(encryptedKey, '0xaddr', TEST_PUBLIC_KEY);
        expect(mockProxy.unlock).toHaveBeenCalledWith('0xsig', encryptedKey, '0xaddr', TEST_PUBLIC_KEY, 'key-share');
      });

      it('uses remembered-device unlock without signing when available', async () => {
        mockProxy.tryUnlockWithRememberedDevice.mockResolvedValue(true);
        const sign = mockSignMessage('0xsig');
        const encryptedKey = mockEncryptedKey();
        const getUserKeyShare = mockGetUserKeyShare();

        await CryptoProxy.unlock(sign, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, getUserKeyShare);

        expect(sign).not.toHaveBeenCalled();
        expect(getUserKeyShare).not.toHaveBeenCalled();
        expect(mockProxy.unlock).not.toHaveBeenCalled();
        expect(CryptoProxy.isActive()).toBe(true);
      });

      it('sets isActive to true after unlock', async () => {
        expect(CryptoProxy.isActive()).toBe(false);

        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(CryptoProxy.isActive()).toBe(true);
      });

      it('is a no-op when already active', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        const sign2 = mockSignMessage();
        await CryptoProxy.unlock(sign2, mockEncryptedKey(), '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare());

        expect(sign2).not.toHaveBeenCalled();
        expect(mockProxy.unlock).toHaveBeenCalledTimes(1);
      });

      it('clears and unlocks again when session identity changes', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        mockProxy.clear.mockResolvedValue(undefined);
        const encryptedKey = mockEncryptedKey();

        await CryptoProxy.unlock(
          mockSignMessage('0xsig1'),
          encryptedKey,
          '0xaddr1',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );
        await CryptoProxy.unlock(
          mockSignMessage('0xsig2'),
          encryptedKey,
          '0xaddr2',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(mockProxy.clear).toHaveBeenCalledTimes(1);
        expect(mockProxy.unlock).toHaveBeenCalledTimes(2);
        expect(mockProxy.unlock).toHaveBeenNthCalledWith(
          2,
          '0xsig2',
          encryptedKey,
          '0xaddr2',
          TEST_PUBLIC_KEY,
          'key-share',
        );
        expect(CryptoProxy.isActiveFor(encryptedKey, '0xaddr2')).toBe(true);
      });

      it('deduplicates concurrent unlock calls', async () => {
        // Pre-create the promise so resolveWorkerUnlock is assigned immediately
        let resolveWorkerUnlock!: () => void;
        const workerUnlockPromise = new Promise<void>((resolve) => {
          resolveWorkerUnlock = resolve;
        });
        mockProxy.unlock.mockReturnValue(workerUnlockPromise);

        const sign = mockSignMessage('0xsig');
        const encryptedKey = mockEncryptedKey();
        const getUserKeyShare = mockGetUserKeyShare();
        const p1 = CryptoProxy.unlock(sign, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, getUserKeyShare);
        const p2 = CryptoProxy.unlock(sign, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, getUserKeyShare);

        resolveWorkerUnlock();
        await Promise.all([p1, p2]);

        // p2 reuses unlockPromise, so Worker unlock is only called once
        expect(mockProxy.unlock).toHaveBeenCalledTimes(1);
      });

      it('notifies subscribers on unlock', async () => {
        const listener = vi.fn();
        CryptoProxy.subscribe(listener);

        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('does not set isActive if Worker unlock fails', async () => {
        mockProxy.unlock.mockRejectedValue(new Error('worker error'));

        await expect(
          CryptoProxy.unlock(mockSignMessage(), mockEncryptedKey(), '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare()),
        ).rejects.toThrow('worker error');

        expect(CryptoProxy.isActive()).toBe(false);
      });

      it('cleans up unlockPromise on failure — allows retry', async () => {
        mockProxy.unlock.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(undefined);

        await expect(
          CryptoProxy.unlock(mockSignMessage(), mockEncryptedKey(), '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare()),
        ).rejects.toThrow('fail');

        await CryptoProxy.unlock(
          mockSignMessage('0xsig2'),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(CryptoProxy.isActive()).toBe(true);
      });

      it('does not notify subscribers if unlock fails', async () => {
        const listener = vi.fn();
        CryptoProxy.subscribe(listener);

        mockProxy.unlock.mockRejectedValue(new Error('fail'));

        await expect(
          CryptoProxy.unlock(mockSignMessage(), mockEncryptedKey(), '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare()),
        ).rejects.toThrow('fail');

        expect(listener).not.toHaveBeenCalled();
      });
    });

    // --- isActive ---

    describe('isActive', () => {
      it('is synchronous and returns false initially', () => {
        expect(CryptoProxy.isActive()).toBe(false);
      });

      it('returns true after unlock', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(CryptoProxy.isActive()).toBe(true);
      });
    });

    // --- Clear ---

    describe('clear', () => {
      it('delegates to Worker and resets isActive', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(CryptoProxy.isActive()).toBe(true);

        mockProxy.clear.mockResolvedValue(undefined);
        await CryptoProxy.clear();

        expect(CryptoProxy.isActive()).toBe(false);
        expect(mockProxy.clear).toHaveBeenCalledTimes(1);
      });

      it('notifies subscribers', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        const listener = vi.fn();
        CryptoProxy.subscribe(listener);

        mockProxy.clear.mockResolvedValue(undefined);
        await CryptoProxy.clear();

        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('clears cached signature — forces new wallet popup on next unlock', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        const sign1 = mockSignMessage('0xsig1');
        const encryptedKey = mockEncryptedKey();
        await CryptoProxy.unlock(sign1, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare());

        mockProxy.clear.mockResolvedValue(undefined);
        await CryptoProxy.clear();

        const sign2 = mockSignMessage('0xsig2');
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(sign2, encryptedKey, '0xaddr', TEST_PUBLIC_KEY, mockGetUserKeyShare());

        expect(sign2).toHaveBeenCalledTimes(1);
        expect(mockProxy.unlock).toHaveBeenCalledWith('0xsig2', encryptedKey, '0xaddr', TEST_PUBLIC_KEY, 'key-share');
      });
    });

    // --- Destroy ---

    describe('destroy', () => {
      it('releases proxy and terminates the Worker', async () => {
        CryptoProxy.init();

        await CryptoProxy.destroy();

        expect(mockProxy[Comlink.releaseProxy]).toHaveBeenCalledTimes(1);
        expect(workerInstances[0]?.terminate).toHaveBeenCalledTimes(1);
      });

      it('resets all state', async () => {
        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(CryptoProxy.isActive()).toBe(true);

        mockProxy.clear.mockResolvedValue(undefined);
        await CryptoProxy.destroy();

        expect(CryptoProxy.isActive()).toBe(false);
      });

      it('can re-init after destroy', async () => {
        CryptoProxy.init();
        mockProxy.clear.mockResolvedValue(undefined);
        await CryptoProxy.destroy();

        CryptoProxy.init();

        expect(workerInstances).toHaveLength(2);
      });
    });

    // --- Subscribe ---

    describe('subscribe', () => {
      it('returns unsubscribe function', () => {
        const unsub = CryptoProxy.subscribe(vi.fn());

        expect(typeof unsub).toBe('function');
      });

      it('unsubscribed listener is not called', async () => {
        const listener = vi.fn();
        const unsub = CryptoProxy.subscribe(listener);
        unsub();

        mockProxy.unlock.mockResolvedValue(undefined);
        await CryptoProxy.unlock(
          mockSignMessage(),
          mockEncryptedKey(),
          '0xaddr',
          TEST_PUBLIC_KEY,
          mockGetUserKeyShare(),
        );

        expect(listener).not.toHaveBeenCalled();
      });
    });

    // --- Delegated crypto methods ---

    describe('delegated methods (main-thread transfer decisions)', () => {
      it('encryptFile uses Comlink.transfer for zero-copy', async () => {
        const input = new Uint8Array([1, 2, 3]);
        const encrypted = new Uint8Array([4, 5, 6]);
        mockProxy.encryptFile.mockResolvedValue(encrypted);

        await CryptoProxy.encryptFile(TEST_PUBLIC_KEY, 1, input, TEST_CONTEXT);

        expect(Comlink.transfer).toHaveBeenCalledWith(input, [input.buffer]);
      });

      it('encryptFileWithOverlays transfers input and delegates overlay recipients', async () => {
        const input = new Uint8Array([1, 2, 3]);
        const encrypted = { blob: new Uint8Array([4, 5, 6]), overlayKeys: [] };
        const overlayRecipients: RecipientDescriptor[] = [
          { recipient: 'processor:grant-1', publicKey: OTHER_PUBLIC_KEY, keyVersion: 1 },
        ];
        mockProxy.encryptFileWithOverlays.mockResolvedValue(encrypted);

        const result = await CryptoProxy.encryptFileWithOverlays(
          TEST_PUBLIC_KEY,
          1,
          input,
          TEST_CONTEXT,
          overlayRecipients,
        );

        expect(Comlink.transfer).toHaveBeenCalledWith(input, [input.buffer]);
        expect(mockProxy.encryptFileWithOverlays).toHaveBeenCalledWith(
          TEST_PUBLIC_KEY,
          1,
          input,
          TEST_CONTEXT,
          overlayRecipients,
        );
        expect(result).toBe(encrypted);
      });

      it('decryptFile uses Comlink.transfer for zero-copy', async () => {
        const blob = new Uint8Array([10, 20]);
        const decrypted = new Uint8Array([1, 2]);
        mockProxy.decryptFile.mockResolvedValue(decrypted);
        const wrapped = mockVaultKey({ ek: 'w' });

        await CryptoProxy.decryptFile(blob, '1', wrapped, TEST_CONTEXT);

        expect(Comlink.transfer).toHaveBeenCalledWith(blob, [blob.buffer]);
      });
    });

    // --- Error propagation from Worker ---

    describe('Worker error propagation', () => {
      it('Worker clear error propagates through CryptoProxy.clear', async () => {
        CryptoProxy.init();
        mockProxy.clear.mockRejectedValue(new Error('clear failed'));

        await expect(CryptoProxy.clear()).rejects.toThrow('clear failed');
        expect(mockProxy[Comlink.releaseProxy]).toHaveBeenCalledOnce();
        expect(workerInstances[0]?.terminate).toHaveBeenCalledOnce();
      });
    });
  });

  describe('SSR environment (no Worker)', () => {
    let CryptoProxy: CryptoProxyFacade;

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules();
      vi.unstubAllGlobals(); // Ensure Worker is NOT available

      const mod = await import('../proxy');
      CryptoProxy = mod.CryptoProxy;
    });

    it('init throws when Worker is undefined', () => {
      expect(() => CryptoProxy.init()).toThrow('CryptoProxy requires a browser environment');
    });

    it('method calls throw when Worker is undefined', async () => {
      await expect(CryptoProxy.encryptApplication(TEST_PUBLIC_KEY, 1, {}, TEST_CONTEXT)).rejects.toThrow(
        'CryptoProxy requires a browser environment',
      );
    });

    it('isActive returns false without throwing', () => {
      expect(CryptoProxy.isActive()).toBe(false);
    });

    it('subscribe works without Worker', () => {
      const listener = vi.fn();
      const unsub = CryptoProxy.subscribe(listener);

      expect(typeof unsub).toBe('function');
      unsub();
    });
  });
});
