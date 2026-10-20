import { argon2idAsync } from '@noble/hashes/argon2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { base32crockford, base64 } from '@scure/base';
import { v7 as uuidv7 } from 'uuid';
import { decryptBinaryData, encryptPayloadBytes } from './data-encryption';
import { keyContextBytes, keyMetadataFingerprint } from './key-context';
import { assertNewStoragePassword, encodePassword } from './password';
import { RECOVERY_CODE_GROUP_REGEX, RECOVERY_CODE_SEPARATOR_REGEX } from './patterns';
import { base64BytesSchema, type PublicEncryptionKey } from './schemas';
import {
  PASSWORD_KDF_PROFILE,
  type PasswordWrap,
  passwordWrapSchema,
  type RecoveryWrap,
  recoveryWrapSchema,
  type UnlockedUserKey,
  type UnlockKeyWrap,
  type UserKeyContext,
  unlockKeyWrapsSchema,
  userKeyContextSchema,
  type WrappedUserKey,
  wrappedUserKeySchema,
} from './schemas/user-key';
import {
  assertEncryptionKeyPair,
  deserializePrivateEncryptionKey,
  generateXWingKeyPair,
  serializePrivateEncryptionKey,
} from './xwing';

export type { UnlockedUserKey, UserKeyContext, WrappedUserKey } from './schemas/user-key';
export { wrappedUserKeySchema } from './schemas/user-key';

type WrapperMetadata = Pick<UnlockKeyWrap, 'method' | 'id' | 'kdf'>;

export function generateUserKeyPair(): { privateKey: Uint8Array; publicKey: PublicEncryptionKey } {
  return generateXWingKeyPair();
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(16);

  try {
    return base32crockford.encode(bytes).replace(RECOVERY_CODE_GROUP_REGEX, '$1-');
  } finally {
    bytes.fill(0);
  }
}

export function userKeyWrapsFingerprint(wraps: WrappedUserKey['wraps']): string {
  return keyMetadataFingerprint(unlockKeyWrapsSchema.parse(wraps));
}

/**
 * Only concrete Worker mutations send this proof to the API; it is never an RPC result.
 */
export function deriveKeyAuthSecret(unlockKey: Uint8Array, context: UserKeyContext): Uint8Array {
  return deriveKey(unlockKey, new Uint8Array(), 'wraps-auth', context);
}

/**
 * Serialize a mutation proof and immediately wipe its derived bytes.
 */
export function encodeKeyAuthSecret(unlockKey: Uint8Array, context: UserKeyContext): string {
  const proof = deriveKeyAuthSecret(unlockKey, context);

  try {
    return base64.encode(proof);
  } finally {
    proof.fill(0);
  }
}

export function deriveKeyAuthHash(unlockKey: Uint8Array, context: UserKeyContext): string {
  const proof = deriveKeyAuthSecret(unlockKey, context);

  try {
    return bytesToHex(sha256(proof));
  } finally {
    proof.fill(0);
  }
}

export async function wrapUserKey(
  privateKey: Uint8Array,
  unlockKey: Uint8Array,
  context: UserKeyContext,
  password: string,
  keyShare: string,
  recoveryCode?: string,
): Promise<WrappedUserKey> {
  assertContext(context);

  const serialized = serializePrivateEncryptionKey(privateKey);

  try {
    const encrypted = await encryptPayloadBytes(serialized, unlockKey, userKeyAad(context));
    const passwordWrap = await createPasswordWrap(unlockKey, context, password, keyShare);
    const wraps: UnlockKeyWrap[] = [passwordWrap];

    if (recoveryCode !== undefined) {
      wraps.push(await createRecoveryWrap(unlockKey, context, recoveryCode));
    }

    return {
      v: 1,
      keyVersion: context.keyVersion,
      pk: { ek: encrypted.ct, iv: encrypted.iv },
      wraps,
    };
  } finally {
    serialized.fill(0);
  }
}

export async function createPasswordWrap(
  unlockKey: Uint8Array,
  context: UserKeyContext,
  password: string,
  keyShare: string,
): Promise<PasswordWrap> {
  assertUnlockKey(unlockKey);
  assertNewStoragePassword(password);

  const metadata = {
    method: 'password' as const,
    id: uuidv7(),
    kdf: {
      ...PASSWORD_KDF_PROFILE,
      salt: base64.encode(randomBytes(16)),
    },
  };
  const key = await derivePasswordKey(metadata, context, password, keyShare);

  try {
    const encrypted = await encryptPayloadBytes(unlockKey, key, wrapperAad(context, metadata));

    return { ...metadata, ek: encrypted.ct, iv: encrypted.iv };
  } finally {
    key.fill(0);
  }
}

export async function createRecoveryWrap(
  unlockKey: Uint8Array,
  context: UserKeyContext,
  recoveryCode: string,
): Promise<RecoveryWrap> {
  assertUnlockKey(unlockKey);

  const metadata = {
    method: 'recovery_code' as const,
    id: uuidv7(),
    kdf: { alg: 'hkdf-sha256' as const, salt: base64.encode(randomBytes(32)) },
  };
  const key = deriveRecoveryKey(metadata, context, recoveryCode);

  try {
    const encrypted = await encryptPayloadBytes(unlockKey, key, wrapperAad(context, metadata));

    return { ...metadata, ek: encrypted.ct, iv: encrypted.iv };
  } finally {
    key.fill(0);
  }
}

export async function unlockUserKey(
  value: WrappedUserKey,
  userId: string,
  expectedPublicKey: PublicEncryptionKey,
  credential:
    | { method: 'password'; password: string; keyShare: string }
    | { method: 'recovery_code'; recoveryCode: string },
): Promise<UnlockedUserKey> {
  /**
   * Validate the KDF allowlist before any Argon2 allocation.
   */
  const wrapped = wrappedUserKeySchema.parse(value);
  const context = { userId, keyVersion: wrapped.keyVersion };
  let wrapper: UnlockKeyWrap;
  let key: Uint8Array;

  if (credential.method === 'password') {
    wrapper = passwordWrapSchema.parse(wrapped.wraps.find((wrap) => wrap.method === 'password'));

    key = await derivePasswordKey(wrapper, context, credential.password, credential.keyShare);
  } else {
    wrapper = recoveryWrapSchema.parse(wrapped.wraps.find((wrap) => wrap.method === 'recovery_code'));

    key = deriveRecoveryKey(wrapper, context, credential.recoveryCode);
  }

  let unlockKey: Uint8Array | undefined;

  try {
    unlockKey = await decryptBinaryData(base64.decode(wrapper.ek), wrapper.iv, key, wrapperAad(context, wrapper));

    const userPrivateKey = await decryptUserKey(wrapped, userId, unlockKey, expectedPublicKey);

    return { userPrivateKey, unlockKey };
  } catch (error) {
    unlockKey?.fill(0);

    throw error;
  } finally {
    key.fill(0);
  }
}

export async function decryptUserKey(
  value: WrappedUserKey,
  userId: string,
  unlockKey: Uint8Array,
  expectedPublicKey: PublicEncryptionKey,
): Promise<Uint8Array> {
  const wrapped = wrappedUserKeySchema.parse(value);
  const serialized = await decryptBinaryData(
    base64.decode(wrapped.pk.ek),
    wrapped.pk.iv,
    unlockKey,
    userKeyAad({ userId, keyVersion: wrapped.keyVersion }),
  );
  let privateKey: Uint8Array | undefined;

  try {
    privateKey = deserializePrivateEncryptionKey(serialized);

    assertEncryptionKeyPair(privateKey, expectedPublicKey);

    return privateKey;
  } catch (error) {
    privateKey?.fill(0);

    throw error;
  } finally {
    serialized.fill(0);
  }
}

async function derivePasswordKey(
  wrapper: Pick<PasswordWrap, 'method' | 'id' | 'kdf'>,
  context: UserKeyContext,
  password: string,
  keyShare: string,
): Promise<Uint8Array> {
  const share = base64.decode(base64BytesSchema(32, 'Expected 32-byte key share').parse(keyShare));
  let passwordBytes: Uint8Array | undefined;
  let stretched: Uint8Array | undefined;

  try {
    passwordBytes = encodePassword(password);

    stretched = await argon2idAsync(passwordBytes, base64.decode(wrapper.kdf.salt), {
      m: PASSWORD_KDF_PROFILE.m,
      t: PASSWORD_KDF_PROFILE.t,
      p: PASSWORD_KDF_PROFILE.p,
      dkLen: 32,
    });

    return deriveKey(stretched, share, 'password', context, wrapper.id);
  } finally {
    passwordBytes?.fill(0);
    share.fill(0);
    stretched?.fill(0);
  }
}

function deriveRecoveryKey(
  wrapper: Pick<RecoveryWrap, 'method' | 'id' | 'kdf'>,
  context: UserKeyContext,
  code: string,
): Uint8Array {
  const bytes = base32crockford.decode(code.replace(RECOVERY_CODE_SEPARATOR_REGEX, ''));

  try {
    if (bytes.length !== 16) {
      throw new Error('Recovery code must contain 128 bits');
    }

    return deriveKey(bytes, base64.decode(wrapper.kdf.salt), 'recovery-code', context, wrapper.id);
  } finally {
    bytes.fill(0);
  }
}

function deriveKey(
  ikm: Uint8Array,
  salt: Uint8Array,
  purpose: string,
  context: UserKeyContext,
  id?: string,
): Uint8Array {
  assertContext(context);

  if (ikm.length !== (purpose === 'recovery-code' ? 16 : 32)) {
    throw new Error('Invalid key material length');
  }

  const info = `comitium.personal-key.${purpose}.v1:${context.userId}:${context.keyVersion}${id ? `:${id}` : ''}`;

  return hkdf(sha256, ikm, salt, new TextEncoder().encode(info), 32);
}

function userKeyAad(context: UserKeyContext): Uint8Array {
  const { userId, keyVersion } = userKeyContextSchema.parse(context);

  return keyContextBytes({ purpose: 'comitium.personal-key', v: 1, userId, keyVersion });
}

function wrapperAad(context: UserKeyContext, wrapper: WrapperMetadata): Uint8Array {
  const { userId, keyVersion } = userKeyContextSchema.parse(context);

  return keyContextBytes({
    purpose: 'comitium.personal-key-wrapper',
    v: 1,
    userId,
    keyVersion,
    method: wrapper.method,
    id: wrapper.id,
    kdf: wrapper.kdf,
  });
}

function assertContext(context: UserKeyContext): void {
  userKeyContextSchema.parse(context);
}

function assertUnlockKey(unlockKey: Uint8Array): void {
  if (unlockKey.length !== 32) {
    throw new Error('Unlock key must be 32 bytes');
  }
}
