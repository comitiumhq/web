import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';

import { OrgRouteShell } from '@/components/auth/org-route-shell';
import { OrgHomePage } from '@/components/features/org-home/org-home-page';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';

export const Route = createFileRoute('/org/$orgId/')({
  ssr: false,
  component: OrgHomeRoute,
});

function OrgHomeRoute() {
  const { orgId } = Route.useParams();
  const renderHomePage = useCallback((org: MyOrg) => <OrgHomePage org={org} />, []);

  return (
    <OrgRouteShell orgId={orgId} errorTitle="Failed to load home">
      {renderHomePage}
    </OrgRouteShell>
  );
}
