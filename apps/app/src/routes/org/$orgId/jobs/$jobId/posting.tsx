import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { useDraftFormContext, useOptionalDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';
import { DraftPostingActions } from '@/components/features/job-posting/draft-posting-actions';
import { JobPostingPage } from '@/components/features/job-posting/job-posting-page';
import { PostingEditor } from '@/components/features/job-posting/posting-editor';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/posting')({
  ssr: false,
  component: PostingRoute,
});

function PostingRoute() {
  const { orgId, jobId } = Route.useParams();
  const draftForm = useOptionalDraftFormContext();

  if (draftForm) {
    return <DraftPostingPage jobId={jobId} />;
  }

  return <JobPostingPage orgId={orgId} jobId={jobId} />;
}

function DraftPostingPage({ jobId }: { jobId: string }) {
  const draftForm = useDraftFormContext();
  const applicationCapacity = useWatch({ control: draftForm.form.control, name: 'applicationCapacity' });
  const handleApplicationCapacityChange = useCallback(
    (capacity: number | null) => {
      draftForm.form.setValue('applicationCapacity', capacity, { shouldDirty: true });
    },
    [draftForm.form],
  );

  return (
    <DraftSectionFrame tab="posting" actions={<DraftPostingActions jobId={jobId} />}>
      <PostingEditor
        orgId={draftForm.orgId}
        owner={{ kind: 'job', jobId }}
        description={draftForm.description}
        onDescriptionChange={draftForm.handleDescriptionChange}
        skills={draftForm.skills}
        onSkillsChange={draftForm.handleSkillsChange}
        formId={draftForm.formId}
        onFormIdChange={draftForm.handleFormIdChange}
        applicationCapacity={applicationCapacity}
        onApplicationCapacityChange={handleApplicationCapacityChange}
      />
    </DraftSectionFrame>
  );
}
