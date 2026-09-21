import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useJobDetailRouteOrg } from '@/components/features/job-detail/job-detail-route-context';
import { useOptionalDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { JobHiringTeam } from '@/components/features/job-hiring-team';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/hiring-team')({
  ssr: false,
  component: HiringTeamPage,
});

function HiringTeamPage() {
  const { jobId } = Route.useParams();
  const org = useJobDetailRouteOrg();
  const draftForm = useOptionalDraftFormContext();

  if (!draftForm) {
    return (
      <div className="h-full overflow-y-auto">
        <PageContainer size="editor" className="py-8 lg:px-10">
          <SectionHeader title="Hiring team" description={null} />
          <JobHiringTeam org={org} jobId={jobId} />
        </PageContainer>
      </div>
    );
  }

  return <Navigate to="/org/$orgId/jobs/$jobId/settings" params={{ orgId: org.id, jobId }} replace />;
}
