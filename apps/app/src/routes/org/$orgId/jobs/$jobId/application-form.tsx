import { createFileRoute } from '@tanstack/react-router';

import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/application-form')({
  ssr: false,
  component: DraftApplicationFormPage,
});

function DraftApplicationFormPage() {
  const { orgId, jobId, formId, handleFormIdChange } = useDraftFormContext();

  return (
    <DraftSectionFrame tab="application-form">
      <ApplicationFormPicker
        orgId={orgId}
        owner={{ kind: 'job', jobId }}
        formId={formId}
        onChange={handleFormIdChange}
      />
    </DraftSectionFrame>
  );
}
