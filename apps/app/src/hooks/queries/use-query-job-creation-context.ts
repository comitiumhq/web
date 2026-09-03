import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { getJobCreationContext } from '@/lib/api/jobs';

function jobCreationContextQueryKey(orgId: string) {
  return ['org', orgId, 'job-creation-context'] as const;
}

export function useQueryJobCreationContext(orgId: string) {
  return useQuery({
    queryKey: jobCreationContextQueryKey(orgId),
    queryFn: () => getJobCreationContext(orgId),
    staleTime: STALE_TIME_DEFAULT,
  });
}
