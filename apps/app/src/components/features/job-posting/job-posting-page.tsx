import type { TipTapDoc } from '@comitium/schemas/common';
import type { JobPosting } from '@comitium/schemas/jobs';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { PageContainer } from '@comitium/ui/page-container';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import { Spinner } from '@comitium/ui/spinner';
import { ArrowSquareOutIcon, PencilIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DraftSectionSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { getPublicSiteOrigin } from '@/config/site';
import {
  usePublishJobPosting,
  useReleaseCommitmentFunds,
  useUnpublishJobPosting,
  useUpdateJobPosting,
} from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { canRunJobLifecycleAction } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';

import { isValidApplicationCapacity } from './application-capacity';
import { ApplicationCapacityControl } from './application-capacity-control';
import { ApplicationFormDialog } from './application-form-dialog';
import { PostingActionsMenu } from './posting-actions-menu';
import { PostingDescriptionEditor } from './posting-description-editor';
import { type PostingTab, PostingTabs } from './posting-tabs';
import { PublishValidationBanner, type PublishValidationError } from './publish-validation-banner';
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
  const publishPosting = usePublishJobPosting({ orgId, jobId });
  const unpublishPosting = useUnpublishJobPosting({ orgId, jobId });
  const releaseCommitmentFunds = useReleaseCommitmentFunds({ orgId, jobId });
  const { canOnJob, isLoading: permissionsLoading } = useJobPermissions(jobId);
  const [applicationCapacity, setApplicationCapacity] = useState<number | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<TipTapDoc | null>(null);
  const [descriptionHasChanged, setDescriptionHasChanged] = useState(false);
  const [activeTab, setActiveTab] = useState<PostingTab>('description');
  const [publishErrors, setPublishErrors] = useState<PublishValidationError<PostingTab>[]>([]);
  const [applicationFormDialogOpen, setApplicationFormDialogOpen] = useState(false);
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);

  useEffect(() => {
    if (postingQuery.data) {
      setApplicationCapacity(postingQuery.data.applicationCapacity);
    }
  }, [postingQuery.data]);

  if (postingQuery.isLoading || summaryQuery.isLoading) {
    return <DraftSectionSkeleton tab="posting" />;
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
  const canPublish = canPublishPosting && postingAllowsPublication && !permissionsLoading;

  const capacityHasChanged = applicationCapacity !== posting.applicationCapacity;
  const capacityIsValid = isValidApplicationCapacity(applicationCapacity);
  const capacityAllowsSave = capacityHasChanged && capacityIsValid && !updatePosting.isPending;
  const canSaveCapacity = canEdit && capacityAllowsSave;
  const currentDescription = descriptionHasChanged ? descriptionDraft : posting.description;
  const descriptionIsPending = updatePosting.isPending;
  const canSaveDescription =
    canEdit && descriptionHasChanged && Boolean(richTextToPlainText(currentDescription)) && !descriptionIsPending;
  const publicPostingUrl = getPublicPostingUrl(job.canonicalUrl);
  const hasUnsavedPostingChanges = descriptionHasChanged || capacityHasChanged;

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

  const handleDescriptionChange = (description: TipTapDoc) => {
    setDescriptionDraft(description);
    setDescriptionHasChanged(true);
    setPublishErrors([]);
  };

  const handleSaveDescription = async () => {
    if (!canSaveDescription || !currentDescription) {
      return;
    }

    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      description: currentDescription,
    });

    setDescriptionHasChanged(false);
  };

  const handleSaveApplicationForm = async (formId: string) => {
    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      formId,
    });
    setPublishErrors([]);
  };

  const handlePublish = () => {
    const errors = getPostingPublishErrors(posting);

    if (errors.length > 0) {
      setPublishErrors(errors);
      setActiveTab(errors[0].target);
      return;
    }

    setPublishErrors([]);
    publishPosting.mutate({ expectedVersion: posting.version });
  };

  const handleUnpublish = () => {
    unpublishPosting.mutate(posting.version, {
      onSuccess: () => setUnpublishOpen(false),
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {publishErrors.length > 0 && (
        <PublishValidationBanner
          errors={publishErrors}
          onClickField={(target) => {
            setActiveTab(target);
            setPublishErrors([]);
          }}
          onDismiss={() => setPublishErrors([])}
        />
      )}

      <PageContainer size="editor" className="space-y-8 py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-heading-20">Posting</h1>
            <Badge variant={isPostingPublished ? 'success' : 'secondary'}>
              {isPostingPublished ? 'Published' : 'Unpublished'}
            </Badge>
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

            {!isPostingPublished && canPublishPosting ? (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={!canPublish || hasUnsavedPostingChanges || publishPosting.isPending}
              >
                {publishPosting.isPending && <Spinner data-icon="inline-start" />}
                {publishPosting.isPending ? 'Publishing...' : 'Publish'}
              </Button>
            ) : null}

            {isPostingPublished && (
              <PostingActionsMenu
                canAddCommitment={canAddCommitment}
                canCopyLink={publicPostingUrl !== null}
                canUnpublish={canUnpublishPosting}
                onAddCommitment={() => setCommitmentOpen(true)}
                onCopyLink={() => void handleCopyPostingLink()}
                onUnpublish={() => setUnpublishOpen(true)}
              />
            )}
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
          value={activeTab}
          onValueChange={setActiveTab}
          description={
            <div className="space-y-3">
              <PostingDescriptionEditor
                content={currentDescription}
                onChange={canEdit ? handleDescriptionChange : undefined}
                readOnly={!canEdit}
                disabled={descriptionIsPending}
              />
              {canEdit && descriptionHasChanged && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void handleSaveDescription()} disabled={!canSaveDescription}>
                    {descriptionIsPending && <Spinner data-icon="inline-start" />}
                    {descriptionIsPending ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              )}
            </div>
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
                    onChange={(value) => {
                      setApplicationCapacity(value);
                      setPublishErrors([]);
                    }}
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

      <ResponseCommitmentDialog
        orgId={orgId}
        jobId={jobId}
        expectedVersion={posting.version}
        open={commitmentOpen}
        onOpenChange={setCommitmentOpen}
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

function getPostingPublishErrors(posting: JobPosting): PublishValidationError<PostingTab>[] {
  const errors: PublishValidationError<PostingTab>[] = [];

  if (!richTextToPlainText(posting.description)) {
    errors.push({ label: 'Description', target: 'description' });
  }

  if (!posting.form || posting.form.isArchived) {
    errors.push({ label: 'Application form', target: 'application-form' });
  }

  if (!isValidApplicationCapacity(posting.applicationCapacity)) {
    errors.push({ label: 'Application capacity', target: 'capacity' });
  }

  return errors;
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
