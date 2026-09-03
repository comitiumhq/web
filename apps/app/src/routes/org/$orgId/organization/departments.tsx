import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { DepartmentsSettingsList } from '@/components/features/org-structure/departments-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/departments')({
  ssr: false,
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.ORG_SETTINGS_WRITE} orgId={orgId}>
      <DepartmentsSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
