import { describe, expect, it } from 'vitest';
import { decryptBinaryData, decryptData, encryptBinaryData, encryptData } from '../data-encryption';
import { BASE64_RE } from './constants';
import { randomDek, tamperBase64 } from './crypto-helpers';

describe('data-encryption', () => {
  describe('encryptData / decryptData (JSON)', () => {
    it('round-trips a simple object', async () => {
      const dek = randomDek();
      const data = { hello: 'world', count: 42 };
      const encrypted = await encryptData(data, dek);
      const decrypted = await decryptData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual(data);
    });

    it('round-trips complex nested data', async () => {
      const dek = randomDek();
      const data = {
        name: 'Jane',
        skills: ['TypeScript', 'React'],
        education: { degree: 'MSc', year: 2020 },
        salary: 120000.5,
        active: true,
        notes: null,
      };

      const encrypted = await encryptData(data, dek);
      const decrypted = await decryptData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual(data);
    });

    it('round-trips unicode data (emoji, CJK, cyrillic)', async () => {
      const dek = randomDek();
      const data = {
        emoji: '👋🌍🔐',
        chinese: '你好世界',
        cyrillic: 'Привет мир',
        mixed: 'Hello 世界 🎉 Мир',
      };

      const encrypted = await encryptData(data, dek);
      const decrypted = await decryptData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual(data);
    });

    it('round-trips empty object', async () => {
      const dek = randomDek();
      const encrypted = await encryptData({}, dek);
      const decrypted = await decryptData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual({});
    });

    it('round-trips a string', async () => {
      const dek = randomDek();
      const data = 'just a plain string';
      const encrypted = await encryptData(data, dek);
      const decrypted = await decryptData<string>(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toBe(data);
    });

    it('produces unique ciphertext and iv on each call', async () => {
      const dek = randomDek();
      const data = { same: 'data' };
      const enc1 = await encryptData(data, dek);
      const enc2 = await encryptData(data, dek);

      expect(enc1.ct).not.toBe(enc2.ct);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it('returns base64 strings for ct and iv', async () => {
      const dek = randomDek();
      const encrypted = await encryptData({ x: 1 }, dek);

      expect(encrypted.ct).toMatch(BASE64_RE);
      expect(encrypted.iv).toMatch(BASE64_RE);
      expect(encrypted.iv).toHaveLength(16); // 12 bytes = 16 base64 chars
    });

    it('throws on wrong DEK', async () => {
      const dek1 = randomDek();
      const dek2 = randomDek();
      const encrypted = await encryptData({ secret: true }, dek1);

      await expect(decryptData(encrypted.ct, encrypted.iv, dek2)).rejects.toThrow();
    });

    it('throws on tampered ciphertext', async () => {
      const dek = randomDek();
      const encrypted = await encryptData({ secret: true }, dek);

      await expect(decryptData(tamperBase64(encrypted.ct), encrypted.iv, dek)).rejects.toThrow();
    });

    it('binds ciphertext to AAD', async () => {
      const dek = randomDek();
      const data = { secret: true };
      const aad = new TextEncoder().encode('application:1:private_fields');
      const wrongAad = new TextEncoder().encode('application:2:private_fields');
      const encrypted = await encryptData(data, dek, aad);
      const decrypted = await decryptData(encrypted.ct, encrypted.iv, dek, aad);

      expect(decrypted).toEqual(data);
      await expect(decryptData(encrypted.ct, encrypted.iv, dek, wrongAad)).rejects.toThrow();
      await expect(decryptData(encrypted.ct, encrypted.iv, dek)).rejects.toThrow();
    });

    it('throws if DEK is not 32 bytes', async () => {
      const shortDek = new Uint8Array(16);

      await expect(encryptData({ x: 1 }, shortDek)).rejects.toThrow('DEK must be 32 bytes');
      await expect(decryptData('aa', 'bb', shortDek)).rejects.toThrow('DEK must be 32 bytes');
    });
  });

  describe('encryptBinaryData / decryptBinaryData', () => {
    it('round-trips binary data', async () => {
      const dek = randomDek();
      const data = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
      const encrypted = await encryptBinaryData(data, dek);
      const decrypted = await decryptBinaryData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual(data);
    });

    it('round-trips a single byte', async () => {
      const dek = randomDek();
      const data = new Uint8Array([42]);
      const encrypted = await encryptBinaryData(data, dek);
      const decrypted = await decryptBinaryData(encrypted.ct, encrypted.iv, dek);

      expect(decrypted).toEqual(data);
    });

    it('returns Uint8Array ct and base64 iv', async () => {
      const dek = randomDek();
      const encrypted = await encryptBinaryData(new Uint8Array([1, 2, 3]), dek);

      expect(encrypted.ct).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toMatch(BASE64_RE);
      expect(encrypted.iv).toHaveLength(16); // 12 bytes base64
    });

    it('ciphertext includes GCM tag (plaintext length + 16)', async () => {
      const dek = randomDek();
      const data = new Uint8Array(100);
      const encrypted = await encryptBinaryData(data, dek);

      // AES-GCM output includes 16-byte auth tag
      expect(encrypted.ct.length).toBe(data.length + 16);
    });

    it('throws on wrong DEK', async () => {
      const dek1 = randomDek();
      const dek2 = randomDek();
      const encrypted = await encryptBinaryData(new Uint8Array([1, 2, 3]), dek1);

      await expect(decryptBinaryData(encrypted.ct, encrypted.iv, dek2)).rejects.toThrow();
    });

    it('binds ciphertext to AAD', async () => {
      const dek = randomDek();
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const aad = new TextEncoder().encode('resume:1:file');
      const wrongAad = new TextEncoder().encode('resume:2:file');
      const encrypted = await encryptBinaryData(data, dek, aad);
      const decrypted = await decryptBinaryData(encrypted.ct, encrypted.iv, dek, aad);

      expect(decrypted).toEqual(data);
      await expect(decryptBinaryData(encrypted.ct, encrypted.iv, dek, wrongAad)).rejects.toThrow();
      await expect(decryptBinaryData(encrypted.ct, encrypted.iv, dek)).rejects.toThrow();
    });

    it('throws if DEK is not 32 bytes', async () => {
      const shortDek = new Uint8Array(16);

      await expect(encryptBinaryData(new Uint8Array([1]), shortDek)).rejects.toThrow('DEK must be 32 bytes');
      await expect(decryptBinaryData(new Uint8Array([1]), 'aa', shortDek)).rejects.toThrow('DEK must be 32 bytes');
    });
  });
});
