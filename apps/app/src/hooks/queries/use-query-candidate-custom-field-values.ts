import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getCandidateCustomFieldValues } from '@/lib/api/candidate-custom-field-values';

export function useQueryCandidateCustomFieldValues(candidateId: string | null) {
  return useQuery({
    queryKey: qk.application.candidateCustomFieldValues(candidateId),
    queryFn: candidateId !== null ? () => getCandidateCustomFieldValues(candidateId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
