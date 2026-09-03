import { orgCreationPreparationSchema, orgCreationStatusSchema } from '@/lib/schemas/org';

import { api } from './client';

export function getOrgCreationStatus() {
  return api.get('/orgs/creation', orgCreationStatusSchema);
}

export function prepareOrgCreation() {
  return api.post('/orgs/creation/prepare', undefined, orgCreationPreparationSchema);
}
