import { CryptoProxy } from '@comitium/crypto';
import { encryptedEnvelopeSchema } from '@comitium/crypto/schemas';
import { afterEach, describe, expect, it } from 'vitest';
import { TEST_KEYS } from '@/test/crypto-helpers';

afterEach(async () => {
  await CryptoProxy.destroy();
});

describe('crypto Worker connection', () => {
  it('encrypts a keyless application through the real Worker and Comlink remote', async () => {
    CryptoProxy.init('https://api.comitium.test/v1');
    const result = await CryptoProxy.encryptApplication(
      TEST_KEYS.alice.publicKey,
      1,
      { answer: 'private application text' },
      { purpose: 'application_answers', orgId: 'org-id', subjectId: 'form-id', fieldId: 'answers' },
    );
    expect(encryptedEnvelopeSchema.safeParse(result).success).toBe(true);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0]).toMatchObject({ recipient: 'org_vault', rkv: 1 });
    expect(JSON.stringify(result)).not.toContain('private application text');
    expect(CryptoProxy.isActive()).toBe(false);
  });

  it('generates a storage passphrase without opening user keys', async () => {
    CryptoProxy.init('https://api.comitium.test/v1');
    const phrase = await CryptoProxy.generateStoragePassword();
    expect(phrase.split(' ')).toHaveLength(6);
    expect(CryptoProxy.isActive()).toBe(false);
  });
});
