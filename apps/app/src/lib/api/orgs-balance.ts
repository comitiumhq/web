import { balanceHistorySchema } from '@/lib/schemas/org';

import { api } from './client';

export function getBalanceHistory(orgId: string, limit = 20) {
  return api.get(`/orgs/${orgId}/balance/history?limit=${limit}`, balanceHistorySchema);
}
