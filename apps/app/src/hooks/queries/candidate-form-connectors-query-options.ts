import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCandidateFormConnectors } from '@/lib/api/form-field-connectors';

export function candidateFormConnectorsQueryOptions(candidateId: string | null, formId: string | null, enabled = true) {
  return queryOptions({
    queryKey: qk.candidate.formConnectors(candidateId, formId),
    queryFn: candidateId && formId ? () => getCandidateFormConnectors(candidateId, formId) : skipToken,
    enabled,
    staleTime: STALE_TIME_DEFAULT,
  });
}
