import { useSession } from '@comitium/auth/use-session';
import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { createContext, createElement, useCallback, useContext, useMemo } from 'react';
import { qk } from '@/hooks/query-keys';
import { getOrgMe } from '@/lib/api/orgs';
import type { OrgMeResponse, OrgRole, Permission } from '@/lib/schemas/org';

export function useQueryOrgMe(orgId?: string) {
  const { isSignedIn } = useSession();

  return useQuery<OrgMeResponse>({
    queryKey: qk.org.permissions(orgId),
    queryFn: orgId ? () => getOrgMe(orgId) : skipToken,
    enabled: isSignedIn,
    staleTime: STALE_TIME_DEFAULT,
    refetchOnWindowFocus: true,
  });
}

interface UsePermissionsReturn {
  can: (permission: Permission) => boolean;
  role: OrgRole | null;
  isAdmin: boolean;
  isLoading: boolean;
}

const EMPTY_SET = new Set<Permission>();

const DEFAULT_VALUE: UsePermissionsReturn = {
  can: () => false,
  role: null,
  isAdmin: false,
  isLoading: true,
};

const PermissionsContext = createContext<UsePermissionsReturn | null>(null);

/**
 * Org-level permissions from the nearest PermissionsProvider.
 * Must be used inside OrgGuard.
 */
export function usePermissions(): UsePermissionsReturn {
  const ctx = useContext(PermissionsContext);

  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider (inside OrgGuard)');
  }

  return ctx;
}

interface PermissionsProviderProps {
  orgId: string;
  children: React.ReactNode;
}

export function PermissionsProvider({ orgId, children }: PermissionsProviderProps) {
  const { data, isLoading } = useQueryOrgMe(orgId);

  const permissionSet = useMemo(
    () => (data?.permissions ? new Set<Permission>(data.permissions) : EMPTY_SET),
    [data?.permissions],
  );

  const role = data?.role ?? null;
  const isAdmin = role === 'org_admin';

  const can = useCallback((permission: Permission) => permissionSet.has(permission), [permissionSet]);

  const value = useMemo<UsePermissionsReturn>(
    () => (isLoading ? DEFAULT_VALUE : { can, role, isAdmin, isLoading: false }),
    [can, role, isAdmin, isLoading],
  );

  return createElement(PermissionsContext.Provider, { value }, children);
}
