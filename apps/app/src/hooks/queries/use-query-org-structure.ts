import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getOrgDepartments, getOrgLocations } from '@/lib/api/org-structure';

interface QueryParams {
  includeArchived?: boolean;
}

export function useQueryOrgDepartments(orgId: string | null, params: QueryParams = {}) {
  const includeArchived = params.includeArchived === true;

  return useQuery({
    queryKey: qk.org.departments(orgId, { includeArchived }),
    queryFn: orgId !== null ? () => getOrgDepartments(orgId, { includeArchived }) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}

export function useQueryOrgLocations(orgId: string | null, params: QueryParams = {}) {
  const includeArchived = params.includeArchived === true;

  return useQuery({
    queryKey: qk.org.locations(orgId, { includeArchived }),
    queryFn: orgId !== null ? () => getOrgLocations(orgId, { includeArchived }) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
