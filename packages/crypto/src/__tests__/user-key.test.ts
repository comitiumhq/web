import { base64 } from '@scure/base';
import { beforeAll, describe, expect, it } from 'vitest';

import { keyContextBytes } from '../key-context';
import { assertNewStoragePassword, encodePassword } from '../password';
import { publicEncryptionKeySchema } from '../schemas';
import { passwordWrapSchema, wrappedUserKeySchema } from '../schemas/user-key';
import { createCryptoSessionIdentity } from '../session';
import {
  createPasswordWrap,
  decryptUserKey,
  deriveKeyAuthHash,
  encodeKeyAuthSecret,
  unlockUserKey,
  userKeyWrapsFingerprint,
} from '../user-key';
import { TEST_KEYS, tamperBase64 } from './crypto-helpers';
import vector from './fixtures/key-protocol-v1.json';
import { KEY_SHARE, OTHER_USER_ID, PASSWORD, UNLOCK_KEY, USER_ID, userKeyFixture } from './unlock-fixtures';

let fixture: Awaited<ReturnType<typeof userKeyFixture>>;

beforeAll(async () => {
  fixture = await userKeyFixture();
}, 15000);

describe('password and recovery key wrappers', () => {
  it('opens fixed v1 ciphertext and preserves its ownership proof and fingerprints', async () => {
    const wrapped = wrappedUserKeySchema.parse(vector.encryptedUserKey);
    const publicKey = publicEncryptionKeySchema.parse(vector.userPublicKey);
    const password = await unlockUserKey(wrapped, vector.userId, publicKey, {
      method: 'password',
      password: vector.password,
      keyShare: vector.keyShare,
    });
    const recovery = await unlockUserKey(wrapped, vector.userId, publicKey, {
      method: 'recovery_code',
      recoveryCode: vector.recoveryCode,
    });
    const context = { userId: vector.userId, keyVersion: wrapped.keyVersion };

    expect(base64.encode(password.userPrivateKey)).toBe(vector.userPrivateKey);
    expect(base64.encode(password.unlockKey)).toBe(vector.unlockKey);
    expect(recovery).toEqual(password);
    expect(encodeKeyAuthSecret(password.unlockKey, context)).toBe(vector.keyAuthSecret);
    expect(deriveKeyAuthHash(password.unlockKey, context)).toBe(vector.keyAuthHash);
    expect(userKeyWrapsFingerprint(wrapped.wraps)).toBe(vector.wrapsFingerprint);
    expect(createCryptoSessionIdentity(wrapped, vector.userId).encryptedKeyFingerprint).toBe(
      vector.encryptedKeyFingerprint,
    );
  });

  it('unlocks the same user key/U with password + share or independent recovery code', async () => {
    const password = await unlockUserKey(fixture.bundle, USER_ID, fixture.publicKey, {
      method: 'password',
      password: PASSWORD,
      keyShare: KEY_SHARE,
    });
    const recovery = await unlockUserKey(fixture.bundle, USER_ID, fixture.publicKey, {
      method: 'recovery_code',
      recoveryCode: fixture.recoveryCode.toLowerCase().replaceAll('-', ' '),
    });

    expect(password.userPrivateKey).toEqual(TEST_KEYS.alice.privateKey);
    expect(recovery.userPrivateKey).toEqual(password.userPrivateKey);
    expect(recovery.unlockKey).toEqual(UNLOCK_KEY);
  });

  it('rejects the wrong password or the wrong share', async () => {
    await expect(
      unlockUserKey(fixture.bundle, USER_ID, fixture.publicKey, {
        method: 'password',
        password: `${PASSWORD}!`,
        keyShare: KEY_SHARE,
      }),
    ).rejects.toThrow();
    await expect(
      unlockUserKey(fixture.bundle, USER_ID, fixture.publicKey, {
        method: 'password',
        password: PASSWORD,
        keyShare: base64.encode(new Uint8Array(32)),
      }),
    ).rejects.toThrow();
  }, 15000);

  it('binds recovery and private-key ciphertext to the user, generation and public key', async () => {
    const credential = { method: 'recovery_code' as const, recoveryCode: fixture.recoveryCode };

    await expect(unlockUserKey(fixture.bundle, OTHER_USER_ID, fixture.publicKey, credential)).rejects.toThrow();
    await expect(
      unlockUserKey({ ...fixture.bundle, keyVersion: 2 }, USER_ID, fixture.publicKey, credential),
    ).rejects.toThrow();
    await expect(unlockUserKey(fixture.bundle, USER_ID, TEST_KEYS.bob.publicKey, credential)).rejects.toThrow(
      'does not match',
    );
    await expect(decryptUserKey(fixture.bundle, OTHER_USER_ID, UNLOCK_KEY, fixture.publicKey)).rejects.toThrow();
  });

  it('authenticates wrapper metadata and ciphertext', async () => {
    const changed = {
      ...fixture.bundle,
      wraps: fixture.bundle.wraps.map((wrap) =>
        wrap.method === 'recovery_code' ? { ...wrap, ek: tamperBase64(wrap.ek) } : wrap,
      ),
    };

    await expect(
      unlockUserKey(changed, USER_ID, fixture.publicKey, {
        method: 'recovery_code',
        recoveryCode: fixture.recoveryCode,
      }),
    ).rejects.toThrow();
  });

  it.each([0, 1, 65537, 2147483647])('rejects unapproved memory cost %s before deriving a key', async (m) => {
    const changed = structuredClone(fixture.bundle);
    const wrapper = passwordWrapSchema.parse(changed.wraps.find((wrap) => wrap.method === 'password'));

    changed.wraps = changed.wraps.map((wrap) =>
      wrap.method === 'password' ? { ...wrapper, kdf: { ...wrapper.kdf, m: m as 65536 } } : wrap,
    );

    await expect(
      unlockUserKey(changed, USER_ID, fixture.publicKey, {
        method: 'password',
        password: PASSWORD,
        keyShare: KEY_SHARE,
      }),
    ).rejects.toThrow();
  });

  it('requires exactly one wrapper of each method, canonical lengths and no unknown fields', () => {
    expect(wrappedUserKeySchema.safeParse({ ...fixture.bundle, wraps: [] }).success).toBe(false);
    expect(
      wrappedUserKeySchema.safeParse({
        ...fixture.bundle,
        wraps: [fixture.bundle.wraps[0], fixture.bundle.wraps[0]],
      }).success,
    ).toBe(false);
    expect(wrappedUserKeySchema.safeParse({ ...fixture.bundle, legacy: true }).success).toBe(false);
  });

  it('changes password wrappers without changing U/private-key ciphertext or recovery', async () => {
    const wrapper = await createPasswordWrap(
      UNLOCK_KEY,
      { userId: USER_ID, keyVersion: 1 },
      'satellite apricot harbor glacier 91',
      KEY_SHARE,
    );
    const rewrapped = {
      ...fixture.bundle,
      wraps: fixture.bundle.wraps.map((wrap) => (wrap.method === 'password' ? wrapper : wrap)),
    };
    const recovered = await unlockUserKey(rewrapped, USER_ID, fixture.publicKey, {
      method: 'recovery_code',
      recoveryCode: fixture.recoveryCode,
    });

    expect(recovered.unlockKey).toEqual(UNLOCK_KEY);
    expect(rewrapped.pk).toBe(fixture.bundle.pk);
    expect(userKeyWrapsFingerprint(rewrapped.wraps)).not.toBe(userKeyWrapsFingerprint(fixture.bundle.wraps));
  });

  it('keeps exact password bytes and rejects the UTF-8 byte cap before KDF', async () => {
    expect(encodePassword(' a\u0301 ')).toEqual(new TextEncoder().encode(' a\u0301 '));
    expect(encodePassword('a\u0301')).not.toEqual(encodePassword('á'));
    expect(() => encodePassword('é'.repeat(513))).toThrow('1024');
    await expect(assertNewStoragePassword('password123456')).rejects.toThrow('easy');
    await expect(assertNewStoragePassword('short')).rejects.toThrow('12');
  });

  it('freezes canonical AAD ordering and binds the mutation verifier to user/generation', () => {
    expect(
      new TextDecoder().decode(
        keyContextBytes({ userId: USER_ID, v: 1, keyVersion: 1, purpose: 'comitium.personal-key' }),
      ),
    ).toBe(`{"keyVersion":1,"purpose":"comitium.personal-key","userId":"${USER_ID}","v":1}`);
    const proof = deriveKeyAuthHash(UNLOCK_KEY, { userId: USER_ID, keyVersion: 1 });

    expect(proof).toMatch(/^[a-f0-9]{64}$/);
    expect(proof).not.toBe(deriveKeyAuthHash(UNLOCK_KEY, { userId: OTHER_USER_ID, keyVersion: 1 }));
    expect(proof).not.toBe(deriveKeyAuthHash(UNLOCK_KEY, { userId: USER_ID, keyVersion: 2 }));
  });
});
