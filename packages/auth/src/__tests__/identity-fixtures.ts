import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import { userSchema } from '@comitium/schemas/auth';
import keyFixture from '../../../crypto/src/__tests__/fixtures/key-protocol-v1.json';

export const AUTH_USER_ID = '01996340-fb00-7000-8000-000000000001';
export const OTHER_AUTH_USER_ID = '01996340-fb00-7000-8000-000000000002';
const PRODUCT_USER_ID = '01996340-fb00-7000-8000-000000000003';
export const API_URL = 'https://identity.comitium.test/v1';

export function identitySession(userId = AUTH_USER_ID, email = 'person@example.com') {
  return {
    session: {
      expiresAt: '2099-01-01T00:00:00.000Z',
    },
    user: { id: userId, email, emailVerified: true },
  };
}

export function productUser(authUserId = AUTH_USER_ID) {
  return {
    id: PRODUCT_USER_ID,
    authUserId,
    publicKey: null,
    encryptedUserKey: null,
    userKeyVersion: null,
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  };
}

export function encryptedProductUser() {
  const user = userSchema.parse({
    ...productUser(),
    id: keyFixture.userId,
    publicKey: keyFixture.userPublicKey,
    encryptedUserKey: keyFixture.encryptedUserKey,
    userKeyVersion: keyFixture.encryptedUserKey.keyVersion,
  });

  assertEncryptionKeyBundle(user);

  return user;
}
