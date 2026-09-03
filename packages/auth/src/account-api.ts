import type { PublicEncryptionKey } from '@comitium/crypto/schemas';
import { type User, type UserKeyShare, userKeyShareSchema, userSchema } from '@comitium/schemas/auth';
import { successSchema } from '@comitium/schemas/public';
import type { z } from 'zod';

interface AuthApiTransport {
  get<T>(url: string, schema: z.ZodType<T>): Promise<T>;
  post<T>(url: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
}

interface InitializeEncryptionKeyBundleInput {
  encryptedPersonalKey: unknown;
  publicKey: PublicEncryptionKey;
}

export interface AuthAccountApi {
  getSession(): Promise<User | null>;
  getUserKeyShare(): Promise<UserKeyShare>;
  initializeEncryptionKeyBundle(input: InitializeEncryptionKeyBundleInput): Promise<unknown>;
}

export function createAuthAccountApi(transport: AuthApiTransport): AuthAccountApi {
  return {
    getSession: () => transport.post('/auth/session', undefined, userSchema),
    getUserKeyShare: () => transport.get('/users/key-share', userKeyShareSchema),
    initializeEncryptionKeyBundle: (input) => transport.post('/users/encryption-key-bundle', input, successSchema),
  };
}
