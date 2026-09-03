import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { EmailTemplateList } from '@/components/features/email-templates/template-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/email-templates')({
  ssr: false,
  component: EmailTemplatesPage,
});

function EmailTemplatesPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.EMAIL_TEMPLATE_WRITE} orgId={orgId}>
      <EmailTemplateList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
