import type { JobSummary } from '@comitium/schemas/jobs';
import { useCallback } from 'react';
import { useUpdateJobContentUri } from '@/hooks/mutations/use-update-job-content-uri';

import { JobDescriptionEditorDialog } from './job-description-editor-dialog';

interface EditJobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  job: JobSummary;
}

export function EditJobDescriptionDialog({ open, onOpenChange, orgId, job }: EditJobDescriptionDialogProps) {
  const { mutateAsync: updateDescription, isPending } = useUpdateJobContentUri();
  const handleSave = useCallback(
    async (_description: unknown, descriptionMarkdown: string) => {
      await updateDescription({
        orgId,
        jobId: job.id,
        expectedVersion: job.version,
        descriptionMarkdown,
      });
    },
    [job.id, job.version, orgId, updateDescription],
  );

  return (
    <JobDescriptionEditorDialog
      descriptionMarkdown={job.description}
      isPending={isPending}
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
    />
  );
}
