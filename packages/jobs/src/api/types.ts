import type { z } from 'zod';

export type PublicJobsTransport = {
  get<T>(path: string, schema: z.ZodType<T, unknown>): Promise<T>;
};
