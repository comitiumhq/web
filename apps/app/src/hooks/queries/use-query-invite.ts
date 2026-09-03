import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getInvite } from '@/lib/api/orgs-invites';

import type { InviteInfo } from '@/lib/schemas/org';

export type { InviteInfo };

export function useQueryInvite(token: string | null) {
  return useQuery<InviteInfo>({
    queryKey: qk.invite.detail(token),
    queryFn: token ? () => getInvite(token) : skipToken,
    staleTime: STALE_TIME_SHORT,
    retry: false,
  });
}
