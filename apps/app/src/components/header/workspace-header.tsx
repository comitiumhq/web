import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { useParams, useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import { getPublicSiteOrigin } from '@/config/site';
import { useQueryMyOrgs } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import { getPreferredOrg } from '@/lib/utils/org';

import { UserMenu } from '../user/user-menu';
import { getVisibleOrgHeaderNavItems } from './nav-items';
import { WorkspaceNav } from './workspace-nav';

const appHeaderClassName =
  'fixed top-0 left-0 z-40 w-full border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/65';

export const WorkspaceHeader = () => {
  const params = useParams({ strict: false }) as { orgId?: string };
  const { location } = useRouterState();
  const pathname = location.pathname;
  const { data: myOrgs } = useQueryMyOrgs();

  const isOrgContext = pathname.startsWith('/org/');
  const isAccountContext = pathname === '/account' || pathname.startsWith('/account/');
  const isInvite = pathname.startsWith('/invite');
  const routeOrgId = isOrgContext ? (params.orgId ?? null) : null;
  const preferredOrgId = isAccountContext ? (getPreferredOrg(myOrgs ?? [])?.id ?? null) : null;
  const currentOrgId = routeOrgId ?? preferredOrgId;
  const currentOrg = currentOrgId ? myOrgs?.find((org) => org.id === currentOrgId) : null;
  const showOrgHeader = !!currentOrgId && !!currentOrg;

  const { data: orgMe } = useQueryOrgMe(showOrgHeader ? currentOrgId : undefined);
  const role = orgMe?.role ?? null;
  const orgNavItems = useMemo(
    () => (showOrgHeader && currentOrgId ? getVisibleOrgHeaderNavItems(currentOrgId, role) : []),
    [currentOrgId, role, showOrgHeader],
  );

  return (
    <header className={appHeaderClassName}>
      <div className="flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <a href={getPublicSiteOrigin()} className="shrink-0">
            <ComitiumLogo />
          </a>

          <WorkspaceNav isOrgContext={isOrgContext || isAccountContext} orgNavItems={orgNavItems} pathname={pathname} />
        </div>

        <div className="flex shrink-0 items-center gap-3">{!isInvite && <UserMenu />}</div>
      </div>
    </header>
  );
};
