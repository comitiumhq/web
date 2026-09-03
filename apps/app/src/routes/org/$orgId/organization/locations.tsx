import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { LocationsSettingsList } from '@/components/features/org-structure/locations-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/locations')({
  ssr: false,
  component: LocationsPage,
});

function LocationsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.ORG_SETTINGS_WRITE} orgId={orgId}>
      <LocationsSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
