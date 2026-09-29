import { Button } from '@comitium/ui/button';
import { Spinner } from '@comitium/ui/spinner';
import { EyeIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftPreviewDialog } from '@/components/features/job-draft/draft-preview-dialog';
import { usePublishJobPosting } from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { canRunJobLifecycleAction } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';

interface DraftPostingActionsProps {
  jobId: string;
}

export function DraftPostingActions({ jobId }: DraftPostingActionsProps) {
  const {
    orgId,
    draft,
    description,
    isDirty,
    isSaving,
    previewOpen,
    setPreviewOpen,
    handlePreviewClick,
    validatePublish,
  } = useDraftFormContext();
  const { data: job } = useQueryJobSummary(jobId);
  const postingQuery = useQueryJobPosting(orgId, jobId);
  const publishPosting = usePublishJobPosting({ orgId, jobId });
  const { canOnJob } = useJobPermissions(jobId);

  const actionsDisabled = !draft || isSaving || isDirty;
  const canPublish =
    job !== undefined &&
    canOnJob(Permission.JOB_EDIT) &&
    canOnJob(Permission.JOB_PUBLISH) &&
    canRunJobLifecycleAction(job.lifecycle, 'publish_posting');

  const handlePublish = () => {
    const posting = postingQuery.data;

    if (!posting) {
      toast.error('Posting settings could not be loaded');
      return;
    }

    if (!validatePublish(Boolean(posting.form?.isArchived))) {
      return;
    }

    publishPosting.mutate({ expectedVersion: posting.version });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePreviewClick} disabled={actionsDisabled}>
          <EyeIcon data-icon="inline-start" />
          Preview
        </Button>
        {canPublish && (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={actionsDisabled || postingQuery.isFetching || publishPosting.isPending}
          >
            {publishPosting.isPending && <Spinner data-icon="inline-start" />}
            {publishPosting.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        )}
      </div>

      {draft && (
        <DraftPreviewDialog
          orgId={orgId}
          draft={draft}
          description={description}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  );
}
