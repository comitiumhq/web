import { createFileRoute, redirect } from '@tanstack/react-router';
import { OrgBalance } from '@/components/features/balance';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { usePermissions } from '@/hooks/use-permissions';

export const Route = createFileRoute('/org/$orgId/organization/funds')({
  ssr: false,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/org/$orgId/organization/company',
      params: { orgId: params.orgId },
      replace: true,
    });
  },
  component: BalancePage,
});

function BalancePage() {
  const { orgId } = Route.useParams();
  const { org } = useCurrentOrg(orgId);

  if (!org) {
    return null;
  }

  return <BalanceOrgAdminGuard org={org} />;
}

function BalanceOrgAdminGuard({ org }: { org: MyOrg }) {
  const { role, isLoading } = usePermissions();
  const isOrgAdmin = role === 'org_admin';

  if (isLoading || !isOrgAdmin) {
    return null;
  }

  return <OrgBalance org={org} />;
}
