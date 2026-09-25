import type { TipTapDoc } from '@comitium/schemas/common';
import type { JobPosting } from '@comitium/schemas/jobs';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { PageContainer } from '@comitium/ui/page-container';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { ArrowSquareOutIcon, CopyIcon, PencilIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { JobDescriptionEditorDialog } from '@/components/features/job-detail/job-description-editor-dialog';
import { getPublicSiteOrigin } from '@/config/site';
import {
  useReleaseCommitmentFunds,
  useUnpublishJobPosting,
  useUpdateActiveCommitmentDescription,
  useUpdateJobPosting,
} from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { canRunJobLifecycleAction } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';

import { ApplicationCapacityControl, isValidApplicationCapacity } from './application-capacity-control';
import { ApplicationFormDialog } from './application-form-dialog';
import { PostingTabs } from './posting-tabs';
import { PublishPostingDialog } from './publish-posting-dialog';
import { ResponseCommitmentDialog } from './response-commitment-dialog';
import { ResponseCommitmentStatus } from './response-commitment-status';

const UNPUBLISH_DESCRIPTION =
  'The Posting will be removed from job boards and stop accepting new applications. Existing candidates will remain in the Pipeline.';

interface JobPostingPageProps {
  orgId: string;
  jobId: string;
}

export function JobPostingPage({ orgId, jobId }: JobPostingPageProps) {
  const postingQuery = useQueryJobPosting(orgId, jobId);
  const summaryQuery = useQueryJobSummary(jobId);
  const updatePosting = useUpdateJobPosting({ orgId, jobId });
  const updateCommitmentDescription = useUpdateActiveCommitmentDescription({ orgId, jobId });
  const unpublishPosting = useUnpublishJobPosting({ orgId, jobId });
  const releaseCommitmentFunds = useReleaseCommitmentFunds({ orgId, jobId });
  const { canOnJob, isLoading: permissionsLoading } = useJobPermissions(jobId);
  const [applicationCapacity, setApplicationCapacity] = useState<number | null>(null);
  const [applicationFormDialogOpen, setApplicationFormDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);

  useEffect(() => {
    if (postingQuery.data) {
      setApplicationCapacity(postingQuery.data.applicationCapacity);
    }
  }, [postingQuery.data]);

  if (postingQuery.isLoading || summaryQuery.isLoading) {
    return <PostingPageSkeleton />;
  }

  const posting = postingQuery.data;
  const job = summaryQuery.data;

  if (!posting || !job || postingQuery.isError || summaryQuery.isError) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <h1 className="text-heading-20">Posting</h1>
        <p className="mt-1 text-copy-14 text-muted-foreground">Posting settings could not be loaded.</p>
      </PageContainer>
    );
  }

  const commitment = posting.commitment;
  const hasActiveCommitment = commitment?.status === 'published';
  const isPostingPublished = posting.status === 'published';
  const isJobClosed = job.status === 'closed';
  const isCommitmentFinalizing = job.lifecycle.commitmentFinalizationPending;
  const commitmentAllowsActivation = commitment === null || commitment.status === 'closed';
  const lifecycleAllowsCommitment = canRunJobLifecycleAction(job.lifecycle, 'close_job');
  const postingAllowsCommitment =
    isPostingPublished && commitmentAllowsActivation && lifecycleAllowsCommitment && !isCommitmentFinalizing;
  const postingAllowsPublication = !isPostingPublished && job.status === 'open' && !isCommitmentFinalizing;

  const canEdit = !isJobClosed && canOnJob(Permission.JOB_EDIT);
  const canPublishPosting = canOnJob(Permission.JOB_PUBLISH);
  const canUnpublishPosting = canOnJob(Permission.JOB_UNPUBLISH);
  const canReleaseFunds = canOnJob(Permission.JOB_CLOSE);
  const canAddCommitment = canPublishPosting && postingAllowsCommitment;
  const canOpenPublishDialog = canPublishPosting && postingAllowsPublication && !permissionsLoading;

  const capacityHasChanged = applicationCapacity !== posting.applicationCapacity;
  const capacityIsValid = isValidApplicationCapacity(applicationCapacity);
  const capacityAllowsSave = capacityHasChanged && capacityIsValid && !updatePosting.isPending;
  const canSaveCapacity = canEdit && capacityAllowsSave;
  const publicPostingUrl = getPublicPostingUrl(job.canonicalUrl);
  const postingStatusLabel = getPostingStatusLabel(posting.status, commitment);

  const handleCopyPostingLink = async () => {
    if (!publicPostingUrl) {
      return;
    }

    await navigator.clipboard.writeText(publicPostingUrl);
    toast.success('Posting link copied');
  };

  const handleSaveCapacity = () => {
    if (!canSaveCapacity) {
      return;
    }

    updatePosting.mutate({
      expectedVersion: posting.version,
      applicationCapacity,
    });
  };

  const handleSaveDescription = async (description: TipTapDoc) => {
    if (hasActiveCommitment) {
      await updateCommitmentDescription.mutateAsync({
        expectedVersion: job.version,
        description,
      });

      return;
    }

    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      description,
    });
  };

  const handleSaveApplicationForm = async (formId: string) => {
    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      formId,
    });
  };

  const handleUnpublish = () => {
    unpublishPosting.mutate(posting.version, {
      onSuccess: () => setUnpublishOpen(false),
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="space-y-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-heading-20">Posting</h1>
            <Badge variant={isPostingPublished ? 'success' : 'secondary'}>{postingStatusLabel}</Badge>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {isPostingPublished && publicPostingUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={publicPostingUrl} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOutIcon data-icon="inline-start" />
                  View posting
                </a>
              </Button>
            )}

            {isPostingPublished && publicPostingUrl && (
              <Button variant="outline" size="sm" onClick={handleCopyPostingLink}>
                <CopyIcon data-icon="inline-start" />
                Copy link
              </Button>
            )}

            {isPostingPublished && canUnpublishPosting ? (
              <Button variant="outline" size="sm" onClick={() => setUnpublishOpen(true)}>
                Unpublish
              </Button>
            ) : null}

            {canAddCommitment ? (
              <Button variant="outline" size="sm" onClick={() => setCommitmentOpen(true)}>
                Add response commitment
              </Button>
            ) : null}

            {!isPostingPublished && canPublishPosting ? (
              <Button size="sm" onClick={() => setPublishOpen(true)} disabled={!canOpenPublishDialog}>
                Publish
              </Button>
            ) : null}
          </div>
        </div>

        <ResponseCommitmentStatus
          commitment={commitment}
          isPostingPublished={isPostingPublished}
          canReleaseFunds={canReleaseFunds}
          isReleasing={releaseCommitmentFunds.isPending || releaseCommitmentFunds.isConfirming}
          onRelease={() => releaseCommitmentFunds.mutate()}
        />

        <PostingTabs
          description={
            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <p className="min-w-0 truncate text-copy-13 text-muted-foreground">
                    {richTextToPlainText(posting.description) ? 'Ready for candidates' : 'No description'}
                  </p>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setDescriptionDialogOpen(true)}>
                      <PencilIcon data-icon="inline-start" />
                      Edit description
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          }
          applicationForm={
            <Card>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <p className="min-w-0 truncate text-copy-13 text-muted-foreground">
                    {posting.form?.title ?? 'No form selected'}
                  </p>
                  <div className="flex items-center gap-2">
                    {posting.form?.isArchived && <Badge variant="secondary">Archived</Badge>}
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setApplicationFormDialogOpen(true)}>
                        <PencilIcon data-icon="inline-start" />
                        Change form
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          }
          capacity={
            <Card>
              <CardContent>
                <div className="space-y-5">
                  <p className="text-copy-13 text-muted-foreground">
                    {applicationCountLabel(posting.completedApplicationCount, posting.applicationCapacity)}
                  </p>
                  <ApplicationCapacityControl
                    value={applicationCapacity}
                    onChange={setApplicationCapacity}
                    disabled={!canEdit || updatePosting.isPending}
                  />
                  {canEdit && capacityHasChanged && (
                    <Button size="sm" onClick={handleSaveCapacity} disabled={!canSaveCapacity}>
                      {updatePosting.isPending && <Spinner data-icon="inline-start" />}
                      {updatePosting.isPending ? 'Saving...' : 'Save capacity'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          }
        />
      </PageContainer>

      <ConfirmDialog
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title="Unpublish this Posting?"
        description={UNPUBLISH_DESCRIPTION}
        actionLabel="Unpublish"
        pendingLabel="Unpublishing..."
        onConfirm={handleUnpublish}
        isPending={unpublishPosting.isPending}
      />

      <PublishPostingDialog
        orgId={orgId}
        jobId={jobId}
        jobTitle={job.title ?? 'Untitled Position'}
        open={publishOpen}
        onOpenChange={setPublishOpen}
      />

      <ResponseCommitmentDialog
        orgId={orgId}
        jobId={jobId}
        expectedVersion={posting.version}
        open={commitmentOpen}
        onOpenChange={setCommitmentOpen}
      />

      <JobDescriptionEditorDialog
        description={posting.description}
        isPending={updatePosting.isPending || updateCommitmentDescription.isPending}
        open={descriptionDialogOpen}
        onOpenChange={setDescriptionDialogOpen}
        onSave={handleSaveDescription}
      />

      <ApplicationFormDialog
        currentFormId={posting.form?.id ?? null}
        isPending={updatePosting.isPending}
        jobId={jobId}
        open={applicationFormDialogOpen}
        orgId={orgId}
        onOpenChange={setApplicationFormDialogOpen}
        onSave={handleSaveApplicationForm}
      />
    </div>
  );
}

function responseDeadlineLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

function getPostingStatusLabel(status: JobPosting['status'], commitment: JobPosting['commitment']): string {
  if (status === 'unpublished') {
    return 'Unpublished';
  }

  if (commitment?.status === 'published') {
    return `Published · Response within ${responseDeadlineLabel(commitment.responseDeadlineDays)}`;
  }

  return 'Published';
}

function getPublicPostingUrl(canonicalUrl: string | null): string | null {
  return canonicalUrl ? new URL(canonicalUrl, getPublicSiteOrigin()).toString() : null;
}

function applicationCountLabel(completedCount: number, capacity: number | null): string {
  const applicationLabel = completedCount === 1 ? 'application' : 'applications';

  if (capacity === null) {
    return `${completedCount} ${applicationLabel} received`;
  }

  return `${completedCount} of ${capacity} applications received`;
}

function PostingPageSkeleton() {
  return (
    <PageContainer size="editor" className="space-y-6 py-8 lg:px-10">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-80 max-w-full" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </PageContainer>
  );
}
