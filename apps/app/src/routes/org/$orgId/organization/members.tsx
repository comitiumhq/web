import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { TeamManagement } from '@/components/features/team-management';
import { useCurrentOrg } from '@/hooks/use-current-org';

export const Route = createFileRoute('/org/$orgId/organization/members')({
  ssr: false,
  component: SettingsMembersPage,
});

function SettingsMembersPage() {
  const { orgId } = Route.useParams();
  const { org, isLoading } = useCurrentOrg(orgId);

  if (isLoading || !org) {
    return <PageLoader />;
  }

  return <TeamManagement org={org} />;
}
