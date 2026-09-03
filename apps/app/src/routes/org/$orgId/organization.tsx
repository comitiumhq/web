import { createFileRoute, Outlet } from '@tanstack/react-router';

import { OrgGuard } from '@/components/auth/org-guard';
import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { SettingsLayout } from '@/components/features/settings-layout';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization')({
  ssr: false,
  component: OrganizationRoute,
});

function OrganizationRoute() {
  const { orgId } = Route.useParams();

  return (
    <OrgGuard orgId={orgId}>
      {() => (
        <RoutePermissionGuard permission={Permission.ORG_SETTINGS_READ} orgId={orgId}>
          <SettingsLayout orgId={orgId}>
            <Outlet />
          </SettingsLayout>
        </RoutePermissionGuard>
      )}
    </OrgGuard>
  );
}
