import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { DataPrivacySettingsPage } from '@/components/features/org-settings/data-privacy-settings-page';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/data-privacy')({
  ssr: false,
  component: DataPrivacyPage,
});

function DataPrivacyPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.ORG_SETTINGS_WRITE} orgId={orgId}>
      <DataPrivacySettingsPage orgId={orgId} />
    </RoutePermissionGuard>
  );
}
