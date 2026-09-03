import { beforeEach, describe, expect, it, vi } from 'vitest';

const rememberedDeviceStoreMock = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  decrypt: vi.fn(),
}));

// ---- Mock modules (before imports) ----

vi.mock('comlink', () => ({
  transfer: vi.fn((data: unknown) => data),
}));

vi.mock('../application-encryption', () => ({
  encryptApplicationWithVaultKey: vi.fn(),
  decryptApplicationWithVaultKey: vi.fn(),
}));

vi.mock('../file-encryption', () => ({
  encryptFileWithVaultKey: vi.fn(),
  encryptFileWithVaultKeyAndOverlays: vi.fn(),
  decryptFileWithVaultKey: vi.fn(),
}));

vi.mock('../personal-key', () => ({
  decryptPersonalKeyWithWrappingKey: vi.fn(),
  generatePersonalKeyPair: vi.fn(),
  unwrapPersonalKeyWithWrappingKey: vi.fn(),
  wrapPersonalKey: vi.fn(),
}));

vi.mock('../email-encryption', () => ({
  encryptEmailContent: vi.fn(),
  encryptEmailContentWithOverlays: vi.fn(),
  decryptEmailContentWithPersonalKey: vi.fn(),
  decryptEmailContentWithVaultKey: vi.fn(),
}));

vi.mock('../vault-key', () => ({
  generateVaultKeyPair: vi.fn(),
  grantVaultAccess: vi.fn(),
  unwrapVaultKey: vi.fn(),
  wrapVaultKey: vi.fn(),
}));

vi.mock('../worker/remembered-device-store', () => ({
  RememberedDeviceStore: vi.fn(function RememberedDeviceStore() {
    return rememberedDeviceStoreMock;
  }),
}));

// ---- Imports after mocks ----

import * as Comlink from 'comlink';
import { decryptApplicationWithVaultKey } from '../application-encryption';
import { decryptEmailContentWithPersonalKey, decryptEmailContentWithVaultKey } from '../email-encryption';
import type { WrappedKey } from '../envelope-key';
import {
  decryptFileWithVaultKey,
  encryptFileWithVaultKey,
  encryptFileWithVaultKeyAndOverlays,
} from '../file-encryption';
import {
  decryptPersonalKeyWithWrappingKey,
  generatePersonalKeyPair,
  unwrapPersonalKeyWithWrappingKey,
  wrapPersonalKey,
} from '../personal-key';
import type { RecipientDescriptor } from '../recipients';
import type { EncryptedEnvelope } from '../schemas';
import { generateVaultKeyPair, grantVaultAccess, unwrapVaultKey, wrapVaultKey } from '../vault-key';
import { CryptoWorkerApi } from '../worker/crypto-api';
import { mockPublicEncryptionKey, mockWrappedKey, mockWrappedPersonalKey } from './crypto-helpers';

// ---- Typed mocks ----

const mockDecryptPersonalKeyWithWrappingKey = decryptPersonalKeyWithWrappingKey as ReturnType<typeof vi.fn>;
const mockUnwrapPersonalKeyWithWrappingKey = unwrapPersonalKeyWithWrappingKey as ReturnType<typeof vi.fn>;
const mockWrapPersonalKey = wrapPersonalKey as ReturnType<typeof vi.fn>;
const mockGeneratePersonalKeyPair = generatePersonalKeyPair as ReturnType<typeof vi.fn>;
const mockDecryptApp = decryptApplicationWithVaultKey as ReturnType<typeof vi.fn>;
const mockEncryptFile = encryptFileWithVaultKey as ReturnType<typeof vi.fn>;
const mockEncryptFileWithOverlays = encryptFileWithVaultKeyAndOverlays as ReturnType<typeof vi.fn>;
const mockDecryptFile = decryptFileWithVaultKey as ReturnType<typeof vi.fn>;
const mockDecryptEmailContentVault = decryptEmailContentWithVaultKey as ReturnType<typeof vi.fn>;
const mockDecryptEmailContentPersonal = decryptEmailContentWithPersonalKey as ReturnType<typeof vi.fn>;
const mockGenerateVaultKeyPair = generateVaultKeyPair as ReturnType<typeof vi.fn>;
const mockWrapVaultKey = wrapVaultKey as ReturnType<typeof vi.fn>;
const mockGrantAccess = grantVaultAccess as ReturnType<typeof vi.fn>;
const mockUnwrapVaultKey = unwrapVaultKey as ReturnType<typeof vi.fn>;

// ---- Helpers ----

const PERSONAL_KEY = new Uint8Array(32).fill(42);
const PERSONAL_KEY_WRAPPING_KEY = new Uint8Array(32).fill(24);
const VAULT_KEY = new Uint8Array(32).fill(99);
const KEY_SHARE = 'key-share';
const WRAPPED_VAULT_KEY: WrappedKey = mockWrappedKey();
const ENCRYPTED_PERSONAL_KEY = mockWrappedPersonalKey();
const TEST_PUBLIC_KEY = mockPublicEncryptionKey();
const OTHER_PUBLIC_KEY = mockPublicEncryptionKey('33'.repeat(32));
const TEST_CONTEXT = {
  purpose: 'application_answers' as const,
  orgId: 'org-1',
  subjectId: 'subject-1',
  fieldId: 'field-1',
};

function mockEncryptedEnvelope(overrides?: Partial<EncryptedEnvelope>): EncryptedEnvelope {
  return {
    v: 1,
    purpose: 'application_answers',
    zip: 'none',
    ct: 'AQIDBA==',
    iv: 'AAAAAAAAAAAAAAAA',
    keys: [{ recipient: 'org_vault', rkv: 1, ...mockWrappedKey() }],
    ...overrides,
  };
}

async function unlockApi(api: CryptoWorkerApi): Promise<void> {
  mockUnwrapPersonalKeyWithWrappingKey.mockResolvedValue({
    personalKey: PERSONAL_KEY,
    personalKeyWrappingKey: Uint8Array.from(PERSONAL_KEY_WRAPPING_KEY),
  });
  await api.unlock('0xsig', ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY, KEY_SHARE);
}

function setupVaultKeyUnwrap(): void {
  mockUnwrapVaultKey.mockResolvedValue(VAULT_KEY);
}

describe('CryptoWorkerApi', () => {
  let api: CryptoWorkerApi;

  beforeEach(() => {
    vi.clearAllMocks();
    rememberedDeviceStoreMock.load.mockResolvedValue(null);
    rememberedDeviceStoreMock.save.mockResolvedValue(undefined);
    rememberedDeviceStoreMock.delete.mockResolvedValue(undefined);
    rememberedDeviceStoreMock.decrypt.mockResolvedValue(Uint8Array.from(PERSONAL_KEY_WRAPPING_KEY));
    api = new CryptoWorkerApi();
  });

  // --- Lifecycle ---

  describe('unlock', () => {
    it('calls unwrapPersonalKey with correct args', async () => {
      mockUnwrapPersonalKeyWithWrappingKey.mockResolvedValue({
        personalKey: PERSONAL_KEY,
        personalKeyWrappingKey: Uint8Array.from(PERSONAL_KEY_WRAPPING_KEY),
      });

      await api.unlock('0xsig', ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY, KEY_SHARE);

      expect(mockUnwrapPersonalKeyWithWrappingKey).toHaveBeenCalledWith(
        ENCRYPTED_PERSONAL_KEY,
        '0xsig',
        '0xaddr',
        KEY_SHARE,
      );
      expect(rememberedDeviceStoreMock.save).toHaveBeenCalledOnce();
    });

    it('sets isActive to true after unlock', async () => {
      expect(api.isActive()).toBe(false);

      await unlockApi(api);

      expect(api.isActive()).toBe(true);
    });

    it('is a no-op when already active for the same session identity', async () => {
      await unlockApi(api);
      mockUnwrapPersonalKeyWithWrappingKey.mockClear();

      await api.unlock('0xother', ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY, KEY_SHARE);

      expect(mockUnwrapPersonalKeyWithWrappingKey).not.toHaveBeenCalled();
    });

    it('clears and unlocks again for a different session identity', async () => {
      await unlockApi(api);
      mockUnwrapPersonalKeyWithWrappingKey.mockClear();
      const nextPersonalKey = new Uint8Array(32).fill(7);
      const nextEncryptedPersonalKey = mockWrappedPersonalKey({ pk: { ek: 'different-ek', iv: 'nn' } });
      mockUnwrapPersonalKeyWithWrappingKey.mockResolvedValue({
        personalKey: nextPersonalKey,
        personalKeyWrappingKey: Uint8Array.from(PERSONAL_KEY_WRAPPING_KEY),
      });

      await api.unlock('0xother', nextEncryptedPersonalKey, '0xother', TEST_PUBLIC_KEY, KEY_SHARE);

      expect(mockUnwrapPersonalKeyWithWrappingKey).toHaveBeenCalledWith(
        nextEncryptedPersonalKey,
        '0xother',
        '0xother',
        KEY_SHARE,
      );
      expect(api.isActive()).toBe(true);
    });
  });

  describe('tryUnlockWithRememberedDevice', () => {
    it('returns false when no remembered-device record exists', async () => {
      const result = await api.tryUnlockWithRememberedDevice(ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY);

      expect(result).toBe(false);
      expect(api.isActive()).toBe(false);
    });

    it('unlocks with a remembered-device record', async () => {
      const record = { id: 'record' };
      rememberedDeviceStoreMock.load.mockResolvedValue(record);
      rememberedDeviceStoreMock.decrypt.mockResolvedValue(Uint8Array.from(PERSONAL_KEY_WRAPPING_KEY));
      mockDecryptPersonalKeyWithWrappingKey.mockResolvedValue(PERSONAL_KEY);

      const result = await api.tryUnlockWithRememberedDevice(ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY);

      expect(result).toBe(true);
      expect(api.isActive()).toBe(true);
      expect(mockDecryptPersonalKeyWithWrappingKey).toHaveBeenCalledWith(
        ENCRYPTED_PERSONAL_KEY,
        expect.any(Uint8Array),
      );
    });

    it('deletes a local record and falls back when remembered decrypt fails', async () => {
      const record = { id: 'record' };
      rememberedDeviceStoreMock.load.mockResolvedValue(record);
      rememberedDeviceStoreMock.decrypt.mockRejectedValue(new Error('bad local key'));

      const result = await api.tryUnlockWithRememberedDevice(ENCRYPTED_PERSONAL_KEY, '0xaddr', TEST_PUBLIC_KEY);

      expect(result).toBe(false);
      expect(rememberedDeviceStoreMock.delete).toHaveBeenCalledOnce();
      expect(api.isActive()).toBe(false);
    });
  });

  describe('clear', () => {
    it('sets isActive to false', async () => {
      await unlockApi(api);

      expect(api.isActive()).toBe(true);

      api.clear();

      expect(api.isActive()).toBe(false);
    });
  });

  // --- Application Encryption ---

  describe('decryptApplication', () => {
    it('unwraps vault key and decrypts', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();

      const envelope = mockEncryptedEnvelope();
      const decrypted = { name: 'Jane' };
      mockDecryptApp.mockResolvedValue(decrypted);

      const result = await api.decryptApplication(envelope, '1', WRAPPED_VAULT_KEY, TEST_CONTEXT);

      expect(mockUnwrapVaultKey).toHaveBeenCalled();
      expect(mockDecryptApp).toHaveBeenCalledWith(envelope, VAULT_KEY, TEST_CONTEXT);
      expect(result).toBe(decrypted);
    });

    it('caches vault key across calls for same orgId', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();
      mockDecryptApp.mockResolvedValue({});

      await api.decryptApplication(mockEncryptedEnvelope(), '1', WRAPPED_VAULT_KEY, TEST_CONTEXT);
      await api.decryptApplication(mockEncryptedEnvelope(), '1', WRAPPED_VAULT_KEY, TEST_CONTEXT);

      expect(mockUnwrapVaultKey).toHaveBeenCalledTimes(1);
      expect(mockDecryptApp).toHaveBeenCalledTimes(2);
    });
  });

  // --- File Encryption ---

  describe('encryptFile', () => {
    it('delegates and transfers result', async () => {
      const input = new Uint8Array([1, 2, 3]);
      const encrypted = new Uint8Array([4, 5, 6, 7]);
      mockEncryptFile.mockResolvedValue(encrypted);

      const result = await api.encryptFile(TEST_PUBLIC_KEY, 1, input, TEST_CONTEXT);

      expect(mockEncryptFile).toHaveBeenCalledWith(TEST_PUBLIC_KEY, 1, input, TEST_CONTEXT);
      expect(Comlink.transfer).toHaveBeenCalledWith(encrypted, [encrypted.buffer]);
      expect(result).toBe(encrypted);
    });
  });

  describe('encryptFileWithOverlays', () => {
    it('delegates and transfers only the encrypted blob buffer', async () => {
      const input = new Uint8Array([1, 2, 3]);
      const overlayRecipients: RecipientDescriptor[] = [
        { recipient: 'processor:grant-1', publicKey: OTHER_PUBLIC_KEY, keyVersion: 1 },
      ];
      const encrypted = {
        blob: new Uint8Array([4, 5, 6, 7]),
        overlayKeys: [{ recipient: 'processor:grant-1', ...mockWrappedKey() }],
      };
      mockEncryptFileWithOverlays.mockResolvedValue(encrypted);

      const result = await api.encryptFileWithOverlays(TEST_PUBLIC_KEY, 1, input, TEST_CONTEXT, overlayRecipients);

      expect(mockEncryptFileWithOverlays).toHaveBeenCalledWith(
        TEST_PUBLIC_KEY,
        1,
        input,
        TEST_CONTEXT,
        overlayRecipients,
      );
      expect(Comlink.transfer).toHaveBeenCalledWith(encrypted, [encrypted.blob.buffer]);
      expect(result).toBe(encrypted);
    });
  });

  describe('decryptFile', () => {
    it('unwraps vault key, decrypts, and transfers result', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();

      const blob = new Uint8Array([10, 20, 30]);
      const decrypted = new Uint8Array([1, 2, 3]);
      mockDecryptFile.mockResolvedValue(decrypted);

      const result = await api.decryptFile(blob, '1', WRAPPED_VAULT_KEY, TEST_CONTEXT);

      expect(mockDecryptFile).toHaveBeenCalledWith(blob, VAULT_KEY, TEST_CONTEXT);
      expect(Comlink.transfer).toHaveBeenCalledWith(decrypted, [decrypted.buffer]);
      expect(result).toBe(decrypted);
    });
  });

  // --- Email Content Encryption ---

  describe('decryptEmailContentForOrganization', () => {
    it('unwraps vault key and decrypts', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();

      const encrypted = mockEncryptedEnvelope();
      const decrypted = { text: 'hello' };
      mockDecryptEmailContentVault.mockResolvedValue(decrypted);

      const result = await api.decryptEmailContentForOrganization(encrypted, '1', WRAPPED_VAULT_KEY, TEST_CONTEXT);

      expect(mockDecryptEmailContentVault).toHaveBeenCalledWith(encrypted, VAULT_KEY, TEST_CONTEXT);
      expect(result).toBe(decrypted);
    });
  });

  describe('decryptEmailContentForApplicant', () => {
    it('uses personal key (not vault key)', async () => {
      await unlockApi(api);

      const encrypted = mockEncryptedEnvelope();
      const decrypted = { text: 'hi' };
      mockDecryptEmailContentPersonal.mockResolvedValue(decrypted);

      const result = await api.decryptEmailContentForApplicant(encrypted, TEST_CONTEXT);

      expect(mockDecryptEmailContentPersonal).toHaveBeenCalledWith(encrypted, PERSONAL_KEY, TEST_CONTEXT);
      expect(result).toBe(decrypted);
    });
  });

  // --- Key Generation ---

  describe('generateAndWrapPersonalKey', () => {
    it('generates keypair, wraps private key, returns public + encrypted', async () => {
      const privateKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const encryptedPersonalKey = mockWrappedPersonalKey();
      mockGeneratePersonalKeyPair.mockReturnValue({ privateKey, publicKey: TEST_PUBLIC_KEY });
      mockWrapPersonalKey.mockResolvedValue(encryptedPersonalKey);

      const result = await api.generateAndWrapPersonalKey('0xsig', '0xaddr', KEY_SHARE);

      expect(mockGeneratePersonalKeyPair).toHaveBeenCalled();
      expect(mockWrapPersonalKey).toHaveBeenCalledWith(privateKey, '0xsig', '0xaddr', KEY_SHARE);
      expect(result.publicKey).toBe(TEST_PUBLIC_KEY);
      expect(result.encryptedPersonalKey).toEqual(encryptedPersonalKey);
    });

    it('zeros private key after wrapping', async () => {
      const privateKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockGeneratePersonalKeyPair.mockReturnValue({ privateKey, publicKey: TEST_PUBLIC_KEY });
      mockWrapPersonalKey.mockResolvedValue(mockWrappedPersonalKey());

      await api.generateAndWrapPersonalKey('0xsig', '0xaddr', KEY_SHARE);

      expect(privateKey.every((b) => b === 0)).toBe(true);
    });

    it('zeros private key even when wrapPersonalKey throws', async () => {
      const privateKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      mockGeneratePersonalKeyPair.mockReturnValue({ privateKey, publicKey: TEST_PUBLIC_KEY });
      mockWrapPersonalKey.mockRejectedValue(new Error('wrap failed'));

      await expect(api.generateAndWrapPersonalKey('0xsig', '0xaddr', KEY_SHARE)).rejects.toThrow('wrap failed');

      expect(privateKey.every((b) => b === 0)).toBe(true);
    });
  });

  describe('generateAndWrapVaultKey', () => {
    it('generates vault keypair, wraps private key, returns public + wrapped', async () => {
      const privateKey = new Uint8Array([1, 2, 3, 4]);

      mockGenerateVaultKeyPair.mockReturnValue({ privateKey, publicKey: OTHER_PUBLIC_KEY });
      const wrappedVaultKey = mockWrappedKey();
      mockWrapVaultKey.mockResolvedValue(wrappedVaultKey);

      const result = await api.generateAndWrapVaultKey(TEST_PUBLIC_KEY);

      expect(mockGenerateVaultKeyPair).toHaveBeenCalled();
      expect(mockWrapVaultKey).toHaveBeenCalledWith(privateKey, TEST_PUBLIC_KEY);
      expect(result.vaultPublicKey).toBe(OTHER_PUBLIC_KEY);
      expect(result.wrappedVaultKey).toEqual(wrappedVaultKey);
      expect(privateKey.every((b) => b === 0)).toBe(true);
    });
  });

  // --- Vault Access ---

  describe('grantVaultAccess', () => {
    it('grants access using personal key', async () => {
      await unlockApi(api);

      const memberWrapped = mockWrappedKey();
      mockGrantAccess.mockResolvedValue(memberWrapped);

      const result = await api.grantVaultAccess(WRAPPED_VAULT_KEY, OTHER_PUBLIC_KEY);

      expect(mockGrantAccess).toHaveBeenCalledWith(WRAPPED_VAULT_KEY, PERSONAL_KEY, OTHER_PUBLIC_KEY);
      expect(result).toBe(memberWrapped);
    });
  });

  describe('blind-index hashing', () => {
    it('derives deterministic tag hashes through cached vault key', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();

      const first = await api.hashTagLabel('org-1', WRAPPED_VAULT_KEY, 'senior engineer');
      const second = await api.hashTagLabel('org-1', WRAPPED_VAULT_KEY, 'senior engineer');
      const different = await api.hashTagLabel('org-1', WRAPPED_VAULT_KEY, 'staff engineer');

      expect(first).toMatch(/^[a-f0-9]{64}$/);
      expect(first).toBe(second);
      expect(first).not.toBe(different);
      expect(mockUnwrapVaultKey).toHaveBeenCalledTimes(1);
    });

    it('normalizes custom field values before hashing', async () => {
      await unlockApi(api);
      setupVaultKeyUnwrap();
      const orgId = '11111111-1111-1111-1111-111111111111';
      const fieldId = '22222222-2222-4222-8222-222222222222';
      const hash = (value: string) =>
        api.hashCustomFieldValue(orgId, WRAPPED_VAULT_KEY, fieldId, 'multiple_choice', value);

      const first = await hash(' Remote ');
      const second = await hash('remote');
      const different = await hash('onsite');

      expect(first).toMatch(/^[a-f0-9]{64}$/);
      expect(first).toBe(second);
      expect(first).not.toBe(different);
      expect(mockUnwrapVaultKey).toHaveBeenCalledTimes(1);
    });
  });
});
