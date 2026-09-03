import { createFileRoute } from '@tanstack/react-router';

import { DraftDescriptionTab } from '@/components/features/job-draft/draft-description-tab';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/description')({
  ssr: false,
  component: DraftDescriptionPage,
});

function DraftDescriptionPage() {
  const { description, handleDescriptionChange } = useDraftFormContext();

  return (
    <DraftSectionFrame tab="description">
      <DraftDescriptionTab content={description} onChange={handleDescriptionChange} />
    </DraftSectionFrame>
  );
}
