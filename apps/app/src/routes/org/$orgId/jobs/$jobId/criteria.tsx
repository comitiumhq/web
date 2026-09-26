import { createFileRoute } from '@tanstack/react-router';

import { CriteriaTab } from '@/components/features/job-criteria';
import { OpenJobCriteriaPage } from '@/components/features/job-criteria/open-job-criteria-page';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';
import { DraftSectionSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/criteria')({
  ssr: false,
  component: JobCriteriaPage,
});

function JobCriteriaPage() {
  const { orgId, jobId } = Route.useParams();
  const { data: job, isLoading } = useQueryJobSummary(jobId);

  if (isLoading || !job) {
    return <DraftSectionSkeleton tab="criteria" />;
  }

  if (job.status === 'draft') {
    return <DraftCriteriaPage />;
  }

  return <OpenJobCriteriaPage orgId={orgId} jobId={jobId} />;
}

function DraftCriteriaPage() {
  const { criteria, handleCriteriaChange } = useDraftFormContext();

  return (
    <DraftSectionFrame tab="criteria">
      <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} />
    </DraftSectionFrame>
  );
}
