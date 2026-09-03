import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_DEFAULT, STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getOrgTeam, getOrgTeamMember, getTeamCalendarStatus } from '@/lib/api/orgs-team';
import type { OrgTeamMember, TeamCalendarStatus } from '@/lib/schemas/org';
import { isDefined } from '@/lib/utils';

export type { OrgTeamMember };

export function useQueryOrgTeam(orgId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<OrgTeamMember[]>({
    queryKey: qk.org.team(orgId),
    queryFn:
      isAuthenticated && isDefined(orgId)
        ? async () => {
            const data = await getOrgTeam(orgId);

            return data.data;
          }
        : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}

export function useQueryOrgTeamMember(orgId?: string, userId?: string) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<OrgTeamMember>({
    queryKey: qk.org.teamMember(orgId, userId),
    queryFn:
      isAuthenticated && isDefined(orgId) && isDefined(userId)
        ? async () => {
            const data = await getOrgTeamMember(orgId, userId);

            return data.data;
          }
        : skipToken,
    staleTime: STALE_TIME_SHORT,
  });
}

export function useQueryOrgTeamMap(orgId?: string) {
  const { data } = useQueryOrgTeam(orgId);

  return useMemo(() => new Map((data ?? []).map((member) => [member.userId, member])), [data]);
}

export function useQueryTeamCalendarStatus(orgId?: string, enabled = true) {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<TeamCalendarStatus[]>({
    queryKey: qk.org.teamCalendarStatus(orgId),
    queryFn:
      enabled && isAuthenticated && isDefined(orgId)
        ? async () => {
            const data = await getTeamCalendarStatus(orgId);

            return data.data;
          }
        : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}

export function useQueryTeamCalendarStatusMap(orgId?: string, enabled = true) {
  const { data } = useQueryTeamCalendarStatus(orgId, enabled);

  return useMemo(() => new Map((data ?? []).map((status) => [status.userId, status.hasCalendar])), [data]);
}
