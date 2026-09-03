import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { ArchiveReasonsSettingsList } from '@/components/features/archive-reasons/reason-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/archive-reasons')({
  ssr: false,
  component: ArchiveReasonsPage,
});

function ArchiveReasonsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.ARCHIVE_REASON_WRITE} orgId={orgId}>
      <ArchiveReasonsSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
