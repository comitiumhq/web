import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { createFileRoute } from '@tanstack/react-router';
import { useJobDetailRouteOrg } from '@/components/features/job-detail/job-detail-route-context';
import { useOptionalDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';
import { JobInterviewPlan } from '@/components/features/job-interview-plan';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/interview-plan')({
  ssr: false,
  component: InterviewPlanPage,
});

function InterviewPlanPage() {
  const { jobId } = Route.useParams();
  const org = useJobDetailRouteOrg();
  const draftForm = useOptionalDraftFormContext();

  if (draftForm) {
    return (
      <DraftSectionFrame tab="interview-plan">
        <JobInterviewPlan
          org={org}
          jobId={jobId}
          draftPlan={{
            selectedPlanId: draftForm.interviewPlanId,
            onSelectPlan: draftForm.handleInterviewPlanChange,
            isSaving: draftForm.isSaving,
          }}
        />
      </DraftSectionFrame>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Interview Plan" description={null} />
        <JobInterviewPlan org={org} jobId={jobId} />
      </PageContainer>
    </div>
  );
}
