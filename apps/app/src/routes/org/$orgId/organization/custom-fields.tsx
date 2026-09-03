import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { CustomFieldsSettingsList } from '@/components/features/custom-fields/custom-fields-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/custom-fields')({
  ssr: false,
  component: CustomFieldsPage,
});

function CustomFieldsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.CUSTOM_FIELD_WRITE} orgId={orgId}>
      <CustomFieldsSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
