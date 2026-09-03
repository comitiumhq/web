import { createFileRoute } from '@tanstack/react-router';

import { RoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { ReasonSettingsList } from '@/components/features/cancel-reschedule-reasons/reason-settings-list';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/organization/interview-reasons')({
  ssr: false,
  component: InterviewReasonsPage,
});

function InterviewReasonsPage() {
  const { orgId } = Route.useParams();

  return (
    <RoutePermissionGuard permission={Permission.CANCEL_RESCHEDULE_REASON_WRITE} orgId={orgId}>
      <ReasonSettingsList orgId={orgId} />
    </RoutePermissionGuard>
  );
}
