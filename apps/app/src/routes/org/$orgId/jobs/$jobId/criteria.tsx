import { createFileRoute } from '@tanstack/react-router';

import { CriteriaTab } from '@/components/features/job-criteria';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/criteria')({
  ssr: false,
  component: DraftCriteriaPage,
});

function DraftCriteriaPage() {
  const { criteria, handleCriteriaChange } = useDraftFormContext();

  return (
    <DraftSectionFrame tab="criteria">
      <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} />
    </DraftSectionFrame>
  );
}
