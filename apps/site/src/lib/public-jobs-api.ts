import { createPublicJobsApi } from '@comitium/jobs/api';
import { api } from './api/client';

export const publicJobsApi = createPublicJobsApi({
  get: (path, schema) => api.get(path, schema),
});
