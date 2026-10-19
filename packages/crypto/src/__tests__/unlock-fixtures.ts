import { base64 } from '@scure/base';
import type { VaultKeyAccess } from '../schemas/vault-key';
import { generateRecoveryCode, wrapUserKey } from '../user-key';
import { wrapSearchKey, wrapVaultKey } from '../vault-key';
import { TEST_KEYS } from './crypto-helpers';

export const USER_ID = '0199a000-0000-7000-8000-000000000001';
export const OTHER_USER_ID = '0199a000-0000-7000-8000-000000000002';
export const ORG_ID = '0199a000-0000-7000-8000-000000000003';
export const DEVICE_ID = '0199a000-0000-7000-8000-000000000004';
export const PASSWORD = 'lunar pelican velvet orchard 73';
export const KEY_SHARE = base64.encode(new Uint8Array(32).fill(7));
export const UNLOCK_KEY = new Uint8Array(32).fill(9);
export const SEARCH_KEY = new Uint8Array(32).fill(11);

export async function userKeyFixture(keyVersion = 1) {
  const recoveryCode = generateRecoveryCode();
  const bundle = await wrapUserKey(
    TEST_KEYS.alice.privateKey,
    UNLOCK_KEY,
    { userId: USER_ID, keyVersion },
    PASSWORD,
    KEY_SHARE,
    recoveryCode,
  );

  return { bundle, recoveryCode, publicKey: TEST_KEYS.alice.publicKey };
}

export async function vaultFixture(vaultKeyVersion = 1): Promise<VaultKeyAccess> {
  const context = { orgId: ORG_ID, vaultKeyVersion, recipientUserId: USER_ID, recipientKeyVersion: 1 };
  const wrappedVaultKey = await wrapVaultKey(TEST_KEYS.bob.privateKey, TEST_KEYS.alice.publicKey, context);
  const searchKey = await wrapSearchKey(SEARCH_KEY, TEST_KEYS.bob.privateKey, {
    orgId: ORG_ID,
    vaultKeyVersion,
    searchKeyVersion: 1,
  });

  return { ...context, wrappedVaultKey, vaultPublicKey: TEST_KEYS.bob.publicKey, searchKey };
}
