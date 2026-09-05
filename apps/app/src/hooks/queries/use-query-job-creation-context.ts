import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getJobCreationContext } from '@/lib/api/jobs';

export function useQueryJobCreationContext(orgId: string) {
  return useQuery({
    queryKey: qk.org.jobCreationContext(orgId),
    queryFn: () => getJobCreationContext(orgId),
    staleTime: STALE_TIME_DEFAULT,
  });
}
