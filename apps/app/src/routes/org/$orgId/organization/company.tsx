import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { SettingsForm } from '@/components/features/org-settings/settings-form';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/company')({
  ssr: false,
  component: CompanyPage,
});

function CompanyPage() {
  const { orgId } = Route.useParams();
  const { org, isLoading } = useCurrentOrg(orgId);

  if (isLoading || !org) {
    return <PageLoader />;
  }

  return (
    <RoutePermissionGuard permission={Permission.ORG_SETTINGS_WRITE} orgId={org.id}>
      <div className="flex flex-col gap-8">
        <PageHeader title="Company Profile" />
        <SettingsForm org={org} />
      </div>
    </RoutePermissionGuard>
  );
}
