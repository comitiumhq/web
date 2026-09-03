import { createFileRoute, Outlet } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/job-templates')({
  ssr: false,
  component: JobTemplatesSettingsLayout,
});

function JobTemplatesSettingsLayout() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.JOB_TEMPLATE_WRITE} orgId={orgId}>
      <Outlet />
    </RoutePermissionGuard>
  );
}
