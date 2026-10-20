import {
  CryptoProxy,
  type FreshAuthenticationHandler,
  type RecoveryCodeHandler,
  type UnlockResult,
} from '@comitium/crypto';
import { assertEncryptionKeyBundle } from '@comitium/crypto/key-bundle';
import type { User } from '@comitium/schemas/auth';

import type { StorageFormValues, StorageMode } from './types';

export async function runStorageAction(
  mode: StorageMode,
  user: User,
  values: StorageFormValues,
  onRecoveryCode: RecoveryCodeHandler,
  confirmFreshAuth: FreshAuthenticationHandler,
  requireRecovery = false,
): Promise<UnlockResult | undefined> {
  const { password, currentPassword, recoveryCode } = values;

  if (mode === 'setup') {
    return CryptoProxy.initializeUserKey(user.id, password, true, requireRecovery ? onRecoveryCode : undefined);
  }

  assertEncryptionKeyBundle(user);

  const wrapped = user.encryptedUserKey;

  switch (mode) {
    case 'recovery-code':
      await CryptoProxy.verifyRecoveryCode(wrapped, user.id, user.publicKey, recoveryCode);

      return;

    case 'unlock':
      return CryptoProxy.unlockWithPassword(wrapped, user.id, user.publicKey, password, true);

    case 'recovery-kit': {
      const result = await verifyCurrentPassword(user, password);

      await CryptoProxy.rewrapUserKey(
        wrapped,
        { rotateRecoveryCode: true, repairShare: false },
        onRecoveryCode,
        confirmFreshAuth,
      );

      return result;
    }

    case 'recovery': {
      if (!recoveryCode) {
        await CryptoProxy.rewrapUserKey(
          wrapped,
          { password, rotateRecoveryCode: false, repairShare: true },
          onRecoveryCode,
          confirmFreshAuth,
        );

        return;
      }

      const result = await CryptoProxy.unlockWithRecoveryCode(wrapped, user.id, user.publicKey, recoveryCode, true);

      await CryptoProxy.rewrapUserKey(
        wrapped,
        { password, rotateRecoveryCode: true, repairShare: true },
        onRecoveryCode,
        confirmFreshAuth,
      );

      return result;
    }

    case 'change': {
      const result = await verifyCurrentPassword(user, currentPassword);

      await CryptoProxy.rewrapUserKey(
        wrapped,
        { password, rotateRecoveryCode: false, repairShare: false },
        onRecoveryCode,
        confirmFreshAuth,
      );

      return result;
    }
  }
}

async function verifyCurrentPassword(user: User, password: string): Promise<UnlockResult | undefined> {
  assertEncryptionKeyBundle(user);

  if (CryptoProxy.isActiveFor(user.encryptedUserKey, user.id)) {
    await CryptoProxy.verifyPassword(user.encryptedUserKey, user.id, user.publicKey, password);
  } else {
    return CryptoProxy.unlockWithPassword(user.encryptedUserKey, user.id, user.publicKey, password, true);
  }
}
