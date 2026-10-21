import { type User, userSchema } from '@comitium/schemas/auth';
import type { z } from 'zod';

import {
  type ZkIdentityApi,
  zkIdentityAttemptSchema,
  zkIdentityCompletionResultSchema,
  zkIdentityStatusSchema,
} from './zk-identity';

interface AuthApiTransport {
  get<T>(url: string, schema: z.ZodType<T>): Promise<T>;
  post<T>(url: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
}

export interface AuthAccountApi extends ZkIdentityApi {
  bootstrapAccount(): Promise<User | null>;
}

export function createAuthAccountApi(transport: AuthApiTransport): AuthAccountApi {
  return {
    completeZkIdentityAttempt: (attemptId, input) =>
      transport.post(`/users/zk-identity/attempts/${attemptId}/complete`, input, zkIdentityCompletionResultSchema),
    createZkIdentityAttempt: () => transport.post('/users/zk-identity/attempts', undefined, zkIdentityAttemptSchema),
    bootstrapAccount: () => transport.post('/auth/bootstrap', undefined, userSchema),
    getZkIdentityStatus: () => transport.get('/users/zk-identity', zkIdentityStatusSchema),
  };
}
