import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { CloseReasonsSettingsList } from '@/components/features/close-reasons/reason-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/close-reasons')({
  ssr: false,
  component: CloseReasonsPage,
});

function CloseReasonsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.CLOSE_REASON_WRITE} orgId={orgId}>
      <CloseReasonsSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
