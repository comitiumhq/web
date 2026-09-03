import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getApplicationFormSubmission } from '@/lib/api/form-submissions';

export function useQueryApplicationFormSubmission(applicationId: string | null) {
  return useQuery({
    queryKey: qk.application.formSubmission(applicationId),
    queryFn: applicationId !== null ? () => getApplicationFormSubmission(applicationId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
