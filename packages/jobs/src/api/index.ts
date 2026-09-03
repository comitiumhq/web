import { createCareersApi } from './careers';
import { createJobsApi } from './jobs';
import type { PublicJobsTransport } from './types';

export type { CareerJobsParams } from './careers';

export function createPublicJobsApi(transport: PublicJobsTransport) {
  return {
    ...createCareersApi(transport),
    ...createJobsApi(transport),
  };
}

export type PublicJobsApi = ReturnType<typeof createPublicJobsApi>;
