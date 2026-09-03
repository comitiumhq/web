import { PageLoader } from '@comitium/ui/page-loader';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/schemas/org';

interface RoutePermissionGuardProps {
  /** Required permission to access this route */
  permission: Permission;
  /** Org UUID for redirect target */
  orgId: string;
  children: React.ReactNode;
}

/**
 * Route-level permission guard that redirects to org dashboard when access is denied.
 * Must be used inside OrgGuard (which provides PermissionsProvider).
 *
 * Unlike PermissionGate (which hides elements), this redirects the user.
 * Use for page-level access control on direct URL navigation.
 */
export function RoutePermissionGuard({ permission, orgId, children }: RoutePermissionGuardProps) {
  const { can, isLoading } = usePermissions();
  const navigate = useNavigate();

  const hasAccess = can(permission);

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      navigate({ to: '/org/$orgId', params: { orgId } });
    }
  }, [isLoading, hasAccess, navigate, orgId]);

  if (isLoading || !hasAccess) {
    return <PageLoader />;
  }

  return children;
}

interface JobRoutePermissionGuardProps {
  permission: Permission;
  orgId: string;
  jobId: string;
  children: React.ReactNode;
}

export function JobRoutePermissionGuard({ permission, orgId, jobId, children }: JobRoutePermissionGuardProps) {
  const { canOnJob, isLoading } = useJobPermissions(jobId);
  const navigate = useNavigate();

  const hasAccess = canOnJob(permission);

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      navigate({ to: '/org/$orgId', params: { orgId } });
    }
  }, [isLoading, hasAccess, navigate, orgId]);

  if (isLoading || !hasAccess) {
    return <PageLoader />;
  }

  return children;
}
