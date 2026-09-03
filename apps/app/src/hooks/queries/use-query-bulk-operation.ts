import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getBulkOperation } from '@/lib/api/bulk-operations';
import { isBulkOperationInProgress } from '@/lib/schemas/bulk-operations';

const BULK_OPERATION_POLL_INTERVAL_MS = 1_500;

export function useQueryBulkOperation(orgId: string, operationId: string | null) {
  return useQuery({
    queryKey: qk.pipeline.bulkOperation(orgId, operationId),
    queryFn: operationId ? () => getBulkOperation(orgId, operationId) : skipToken,
    refetchInterval: (query) => (isBulkOperationInProgress(query.state.data) ? BULK_OPERATION_POLL_INTERVAL_MS : false),
  });
}
