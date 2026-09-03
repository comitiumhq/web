import { createFileRoute, Outlet } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/interviews')({
  ssr: false,
  component: InterviewsSettingsLayout,
});

function InterviewsSettingsLayout() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.INTERVIEW_PLAN_WRITE} orgId={orgId}>
      <Outlet />
    </RoutePermissionGuard>
  );
}
