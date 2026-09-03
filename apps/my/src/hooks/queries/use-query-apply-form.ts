import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { publicJobsApi } from '@/lib/public-jobs-api';

export type CareerApplyFormTarget = {
  orgSlug: string;
  postingSlug: string;
};

export function useQueryApplyForm(target: CareerApplyFormTarget | null) {
  return useQuery({
    queryKey: qk.careers.applyForm(target),
    queryFn: target ? () => publicJobsApi.getCareerApplyForm(target.orgSlug, target.postingSlug) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
