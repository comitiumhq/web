import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getMemberAccess } from '@/lib/api/org-structure';

export function useQueryMemberAccess(orgId: string | null, userId: string | null) {
  return useQuery({
    queryKey: qk.org.memberAccess(orgId, userId),
    queryFn: orgId !== null && userId !== null ? () => getMemberAccess(orgId, userId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
