import { useIsAuthenticated } from '@comitium/auth/use-is-authenticated';
import { STALE_TIME_SHORT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getMyJobAccess } from '@/lib/api/jobs-pipeline';
import type { Permission } from '@/lib/schemas/org';

interface UseJobPermissionsReturn {
  canOnJob: (permission: Permission) => boolean;
  jobRole: string | null;
  isOnHiringTeam: boolean;
  isLoading: boolean;
}

const EMPTY_SET = new Set<Permission>();

/**
 * Job-level permission check.
 * The API resolves org permissions, direct job grants, and department grants.
 * Hiring-team membership is returned separately for relationship-only flows.
 */
export function useJobPermissions(jobId: string): UseJobPermissionsReturn {
  const isAuthenticated = useIsAuthenticated();

  const { data: jobAccess, isLoading } = useQuery({
    queryKey: qk.jobs.accessMe(jobId),
    queryFn: jobId.length > 0 ? () => getMyJobAccess(jobId) : skipToken,
    enabled: isAuthenticated,
    staleTime: STALE_TIME_SHORT,
    retry: false,
  });

  const permissionSet = useMemo(
    () => (jobAccess?.permissions ? new Set<Permission>(jobAccess.permissions as Permission[]) : EMPTY_SET),
    [jobAccess?.permissions],
  );

  const canOnJob = useCallback((permission: Permission) => permissionSet.has(permission), [permissionSet]);

  const jobRole = jobAccess?.effectiveAccessRole ?? null;
  const isOnHiringTeam = jobAccess?.isOnHiringTeam ?? false;

  return useMemo<UseJobPermissionsReturn>(
    () => ({ canOnJob, jobRole, isOnHiringTeam, isLoading }),
    [canOnJob, jobRole, isOnHiringTeam, isLoading],
  );
}
