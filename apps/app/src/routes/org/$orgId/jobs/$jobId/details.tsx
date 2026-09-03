import { Form } from '@comitium/ui/form';
import { createFileRoute } from '@tanstack/react-router';
import { DraftDetailsTab } from '@/components/features/job-draft/draft-details-tab';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/details')({
  ssr: false,
  component: DraftDetailsPage,
});

function DraftDetailsPage() {
  const { orgId, form, draft } = useDraftFormContext();
  const editableStructure = !draft?.departmentId || !draft?.locationId;

  return (
    <DraftSectionFrame tab="details">
      <Form {...form}>
        <DraftDetailsTab orgId={orgId} form={form} editableStructure={editableStructure} />
      </Form>
    </DraftSectionFrame>
  );
}
