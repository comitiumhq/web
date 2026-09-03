import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { type ApplicationFormOptionsOwner, getApplicationFormOptions } from '@/lib/api/application-form-options';

function applicationFormOptionsQueryKey(orgId: string, owner: ApplicationFormOptionsOwner) {
  return owner.kind === 'job'
    ? qk.applicationFormOptions.job(owner.jobId)
    : qk.applicationFormOptions.jobTemplate(orgId);
}

export function useQueryApplicationFormOptions(orgId: string, owner: ApplicationFormOptionsOwner) {
  return useQuery({
    queryKey: applicationFormOptionsQueryKey(orgId, owner),
    queryFn: () => getApplicationFormOptions(orgId, owner),
    staleTime: STALE_TIME_DEFAULT,
  });
}
