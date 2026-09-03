import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { CryptoContextInput } from '../context';
import {
  decryptFileWithVaultKey,
  encryptFileWithVaultKey,
  encryptFileWithVaultKeyAndOverlays,
} from '../file-encryption';
import type { RecipientDescriptor } from '../recipients';
import { processorRecipient } from '../recipients';
import type { EnvelopeKey } from '../schemas';
import { generateVaultKeyPair } from '../vault-key';
import { tamperBase64, tamperHex } from './crypto-helpers';

describe('file-encryption (PDF blob pack/unpack)', () => {
  const resumeContext: CryptoContextInput = {
    purpose: 'encrypted_file',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'resume',
  };

  const wrongResumeContext: CryptoContextInput = {
    ...resumeContext,
    subjectId: 'application-2',
  };

  describe('encryptFileWithVaultKey / decryptFileWithVaultKey', () => {
    it('round-trips file bytes', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const decrypted = await decryptFileWithVaultKey(blob, vault.privateKey, resumeContext);

      expect(decrypted).toEqual(data);
    });

    it('round-trips a single byte', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([42]);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const decrypted = await decryptFileWithVaultKey(blob, vault.privateKey, resumeContext);

      expect(decrypted).toEqual(data);
    });

    it('binds encrypted file to CryptoContext AAD', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([9, 8, 7, 6, 5]);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const decrypted = await decryptFileWithVaultKey(blob, vault.privateKey, resumeContext);

      expect(decrypted).toEqual(data);
      await expect(decryptFileWithVaultKey(blob, vault.privateKey, wrongResumeContext)).rejects.toThrow();
    });

    it('round-trips max resume size (5MB)', { timeout: 60_000 }, async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array(5 * 1024 * 1024);

      for (let i = 0; i < data.length; i += 65536) {
        crypto.getRandomValues(data.subarray(i, Math.min(i + 65536, data.length)));
      }

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const decrypted = await decryptFileWithVaultKey(blob, vault.privateKey, resumeContext);

      expect(decrypted).toHaveLength(data.length);
      expect(Buffer.from(decrypted).equals(Buffer.from(data))).toBe(true);
    });

    it('blob is larger than plaintext (header + metadata + ciphertext with GCM tag)', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array(1000);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);

      // 4 bytes header + JSON metadata (~200+ bytes) + 1000 + 16 (16-byte GCM auth tag)
      expect(blob.length).toBeGreaterThan(data.length + 4 + 16);
    });

    it('blob starts with uint32 BE metadata length prefix', async () => {
      const vault = generateVaultKeyPair();
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, new Uint8Array([1, 2, 3]), resumeContext);

      const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
      const metadataLength = view.getUint32(0, false);

      const metaBytes = blob.slice(4, 4 + metadataLength);
      const metadata = JSON.parse(new TextDecoder().decode(metaBytes));

      expect(metadata.v).toBe(1);
      expect(metadata.originalSize).toBe(3);
      expect(metadata.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(metadata.iv).toHaveLength(16); // 12 bytes base64
      expect(metadata.purpose).toBe('encrypted_file');
      expect(metadata.key).toBeUndefined();
      expect(metadata.keys).toHaveLength(1);
      expect(metadata.keys[0].recipient).toBe('org_vault');
      expect(metadata.keys[0].epk).toMatch(/^[0-9a-f]{64}$/);
      expect(metadata.keys[0].ek).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(metadata.keys[0].iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(metadata.keys[0].iv).toHaveLength(16); // 12 bytes base64
    });

    it('originalSize in metadata matches decrypted result length', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array(777);
      crypto.getRandomValues(data);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);

      const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
      const metadataLength = view.getUint32(0, false);
      const metadata = JSON.parse(new TextDecoder().decode(blob.slice(4, 4 + metadataLength)));

      expect(metadata.originalSize).toBe(777);

      const decrypted = await decryptFileWithVaultKey(blob, vault.privateKey, resumeContext);

      expect(decrypted.length).toBe(metadata.originalSize);
    });

    it('produces unique blobs each time', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([10, 20, 30]);

      const blob1 = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const blob2 = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);

      expect(blob1).not.toEqual(blob2);
    });

    it('returns processor overlay keys without storing them in the encrypted file', async () => {
      const vault = generateVaultKeyPair();
      const processor = generateVaultKeyPair();
      const data = new Uint8Array([1, 3, 3, 7]);

      const { blob, overlayKeys } = await encryptFileWithVaultKeyAndOverlays(vault.publicKey, 1, data, resumeContext, [
        processorRecipient('grant-1', processor.publicKey),
      ]);

      const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
      const metadataLength = view.getUint32(0, false);
      const metadata = JSON.parse(new TextDecoder().decode(blob.slice(4, 4 + metadataLength)));

      expect(metadata.keys.map((key: { recipient: string }) => key.recipient)).toEqual(['org_vault']);
      expect(overlayKeys).toHaveLength(1);
      expect(overlayKeys[0].recipient).toBe('processor:grant-1');
    });

    it('rejects malformed overlay processor recipients at the crypto boundary', async () => {
      const vault = generateVaultKeyPair();
      const processor = generateVaultKeyPair();
      const malformedProcessor = {
        recipient: 'processor:grant:extra',
        publicKey: processor.publicKey,
      } as unknown as RecipientDescriptor;

      await expect(
        encryptFileWithVaultKeyAndOverlays(vault.publicKey, 1, new Uint8Array([1, 2, 3]), resumeContext, [
          malformedProcessor,
        ]),
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('fails to decrypt with wrong vault key', async () => {
      const vault1 = generateVaultKeyPair();
      const vault2 = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3]);

      const blob = await encryptFileWithVaultKey(vault1.publicKey, 1, data, resumeContext);

      await expect(decryptFileWithVaultKey(blob, vault2.privateKey, resumeContext)).rejects.toThrow();
    });

    it('fails on truncated blob (too short for header)', async () => {
      const vault = generateVaultKeyPair();
      const truncated = new Uint8Array([0, 0, 0]); // less than 4 bytes

      await expect(decryptFileWithVaultKey(truncated, vault.privateKey, resumeContext)).rejects.toThrow(
        'Invalid encrypted blob: too short',
      );
    });

    it('fails on blob with metadata length exceeding size', async () => {
      const vault = generateVaultKeyPair();
      const bad = new Uint8Array(8);
      const view = new DataView(bad.buffer);

      view.setUint32(0, 9999, false); // claims 9999 bytes of metadata

      await expect(decryptFileWithVaultKey(bad, vault.privateKey, resumeContext)).rejects.toThrow(
        'metadata length exceeds blob size',
      );
    });

    it('fails on tampered ciphertext within blob', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);

      const tampered = new Uint8Array(blob);
      tampered[tampered.length - 1] ^= 0xff;

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow();
    });

    it('fails when the metadata key kemCt (ML-KEM half) is tampered', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({
        ...metadata,
        keys: metadata.keys.map((key) => ({ ...key, kemCt: tamperBase64(key.kemCt) })),
      }));

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow();
    });

    it('fails when the metadata key epk (X25519 half) is tampered', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({
        ...metadata,
        keys: metadata.keys.map((key) => ({ ...key, epk: tamperHex(key.epk) })),
      }));

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow();
    });

    it('fails when the metadata key iv is tampered', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({
        ...metadata,
        keys: metadata.keys.map((key) => ({ ...key, iv: tamperBase64(key.iv) })),
      }));

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow();
    });

    it('fails when metadata purpose is changed', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({ ...metadata, purpose: 'application_file' }));

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow(
        'File envelope purpose mismatch: expected encrypted_file, got application_file',
      );
    });

    it('fails when metadata originalSize is changed', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({ ...metadata, originalSize: data.length + 1 }));

      await expect(decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext)).rejects.toThrow(
        'File envelope originalSize mismatch',
      );
    });

    it('rejects an unsupported metadata version at the schema-parse boundary', async () => {
      const vault = generateVaultKeyPair();
      const data = new Uint8Array([1, 2, 3]);
      const blob = await encryptFileWithVaultKey(vault.publicKey, 1, data, resumeContext);
      const tampered = mutateBlobMetadata(blob, (metadata) => ({ ...metadata, v: 2 }));

      const error = await decryptFileWithVaultKey(tampered, vault.privateKey, resumeContext).then(
        () => null,
        (thrown: unknown) => thrown,
      );

      expect(error).toBeInstanceOf(ZodError);
      expect((error as ZodError).issues.some((issue) => issue.path[0] === 'v')).toBe(true);
    });
  });
});

type FileMetadata = {
  v: number;
  purpose: string;
  iv: string;
  keys: EnvelopeKey[];
  originalSize: number;
};

function mutateBlobMetadata(blob: Uint8Array, mutate: (metadata: FileMetadata) => FileMetadata): Uint8Array {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const metadataLength = view.getUint32(0, false);
  const metadata = JSON.parse(new TextDecoder().decode(blob.slice(4, 4 + metadataLength))) as FileMetadata;
  const nextMetadata = mutate({
    ...metadata,
    keys: metadata.keys.map((key) => ({ ...key })),
  });
  const metaBytes = new TextEncoder().encode(JSON.stringify(nextMetadata));
  const ciphertext = blob.slice(4 + metadataLength);
  const result = new Uint8Array(4 + metaBytes.length + ciphertext.length);
  const resultView = new DataView(result.buffer);

  resultView.setUint32(0, metaBytes.length, false);
  result.set(metaBytes, 4);
  result.set(ciphertext, 4 + metaBytes.length);

  return result;
}
