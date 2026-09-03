import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getBulkOperationCapabilities } from '@/lib/api/bulk-operations';

export function useQueryBulkOperationCapabilities(orgId: string | null) {
  return useQuery({
    queryKey: qk.pipeline.bulkOperationCapabilities(orgId),
    queryFn: orgId ? () => getBulkOperationCapabilities(orgId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
