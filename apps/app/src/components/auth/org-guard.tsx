import { useSession } from '@comitium/auth/use-session';
import { isUnauthorizedError } from '@comitium/schemas/api-query-policy';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageLoader } from '@comitium/ui/page-loader';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { SignInIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { WorkspaceSetupShell } from '@/components/features/workspace-setup/workspace-setup-shell';
import { type MyOrg, useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useAutoDetectTimezone } from '@/hooks/use-auto-detect-timezone';
import { PermissionsProvider, useQueryOrgMe } from '@/hooks/use-permissions';

import { AuthSessionRecovery } from './auth-session-recovery';
import { LoginButton } from './login-button';

interface OrgGuardProps {
  orgId: string;
  loadingFallback?: ReactNode;
  children: (org: MyOrg) => ReactNode;
}

export function OrgGuard({ orgId, loadingFallback, children }: OrgGuardProps) {
  const { isSignedIn, isSessionLoading, needsSessionRecovery } = useSession();
  const { org, hasSessionExpired, isWaitingForOrganization } = useOrgGuardState(orgId, isSignedIn);

  if (isSessionLoading && !org) {
    return loadingFallback ?? <PageLoader />;
  }

  if (needsSessionRecovery) {
    return <AuthSessionRecovery />;
  }

  if (!isSessionLoading && !isSignedIn) {
    return <SignInRequired />;
  }

  if (hasSessionExpired) {
    return <AuthSessionRecovery />;
  }

  if (isWaitingForOrganization) {
    return loadingFallback ?? <PageLoader />;
  }

  if (!org) {
    return <RouteNotFound />;
  }

  return <OrgGuardContent org={org}>{children(org)}</OrgGuardContent>;
}

function useOrgGuardState(orgId: string, isSignedIn: boolean) {
  const orgsQuery = useQueryMyOrgs();
  const org = orgsQuery.data?.find((organization) => organization.id === orgId);
  const memberQuery = useQueryOrgMe(isSignedIn && org ? orgId : undefined);
  const isWaitingForOrganization = !org && orgsQuery.isLoading;
  const hasSessionExpired = isUnauthorizedError(orgsQuery.error) || isUnauthorizedError(memberQuery.error);

  return { org, hasSessionExpired, isWaitingForOrganization };
}

function SignInRequired() {
  return (
    <EmptyState icon={SignInIcon} title="Sign in required" description="Log in to continue.">
      <LoginButton className="mt-6" />
    </EmptyState>
  );
}

function OrgGuardContent({ org, children }: { org: MyOrg; children: ReactNode }) {
  return (
    <PermissionsProvider orgId={org.id}>
      <AutoDetectTimezone orgId={org.id} />
      <WorkspaceSetupShell orgId={org.id}>{children}</WorkspaceSetupShell>
    </PermissionsProvider>
  );
}

function AutoDetectTimezone({ orgId }: { orgId: string }) {
  useAutoDetectTimezone(orgId);

  return null;
}
