import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { TagSettingsList } from '@/components/features/candidate-tags/tag-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/tags')({
  ssr: false,
  component: TagsPage,
});

function TagsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.TAG_WRITE} orgId={orgId}>
      <TagSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
