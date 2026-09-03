import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { OrgBalance } from '@/components/features/balance';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { usePermissions } from '@/hooks/use-permissions';

export const Route = createFileRoute('/org/$orgId/organization/funds')({
  ssr: false,
  component: BalancePage,
});

function BalancePage() {
  const { orgId } = Route.useParams();
  const { org, isLoading } = useCurrentOrg(orgId);

  if (isLoading || !org) {
    return <PageLoader />;
  }

  return <BalanceOrgAdminGuard org={org} />;
}

function BalanceOrgAdminGuard({ org }: { org: MyOrg }) {
  const { role, isLoading } = usePermissions();
  const navigate = useNavigate();
  const isOrgAdmin = role === 'org_admin';

  useEffect(() => {
    if (!isLoading && !isOrgAdmin) {
      navigate({ to: '/org/$orgId', params: { orgId: org.id } });
    }
  }, [isLoading, isOrgAdmin, navigate, org.id]);

  if (isLoading || !isOrgAdmin) {
    return <PageLoader />;
  }

  return <OrgBalance org={org} />;
}
