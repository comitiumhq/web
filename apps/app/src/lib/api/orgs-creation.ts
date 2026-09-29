import { createOrgResponseSchema, orgCreationStatusSchema } from '@/lib/schemas/org';

import { api } from './client';

export function getOrgCreationStatus() {
  return api.get('/orgs/creation', orgCreationStatusSchema);
}

export function createOrg() {
  return api.post('/orgs/creation', undefined, createOrgResponseSchema);
}
