import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { PageContainer } from '@comitium/ui/page-container';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { ArrowSquareOutIcon, CopyIcon, PencilIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { JobDescriptionEditorDialog } from '@/components/features/job-detail/job-description-editor-dialog';
import { useUnpublishJobPosting, useUpdateJobPosting } from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { Permission } from '@/lib/schemas/org';

import { ApplicationCapacityControl, isValidApplicationCapacity } from './application-capacity-control';
import { ApplicationFormDialog } from './application-form-dialog';
import { PublishJobDialogV2 } from './publish-job-dialog-v2';

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
  const unpublishPosting = useUnpublishJobPosting({ orgId, jobId });
  const { canOnJob, isLoading: permissionsLoading } = useJobPermissions(jobId);
  const [applicationCapacity, setApplicationCapacity] = useState<number | null>(null);
  const [applicationFormDialogOpen, setApplicationFormDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
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

  const isPublished = posting.status === 'published';
  const isClosed = job.status === 'closed';
  const canEdit = !isClosed && canOnJob(Permission.JOB_EDIT);
  const canPublishPosting = canOnJob(Permission.JOB_PUBLISH);
  const canUnpublishPosting = canOnJob(Permission.JOB_UNPUBLISH);
  const capacityChanged = applicationCapacity !== posting.applicationCapacity;
  const capacityIsValid = isValidApplicationCapacity(applicationCapacity);
  const canSaveCapacity = canEdit && capacityChanged && capacityIsValid && !updatePosting.isPending;

  const canOpenPublishDialog = canPublishPosting && !isPublished && job.status === 'open' && !permissionsLoading;

  const handleCopyPostingLink = async () => {
    if (!job.canonicalUrl) {
      return;
    }

    const publicUrl = new URL(job.canonicalUrl, window.location.origin).toString();

    await navigator.clipboard.writeText(publicUrl);
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

  const handleSaveDescription = async (description: unknown, descriptionMarkdown: string) => {
    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      description,
      descriptionMarkdown,
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-heading-20">Posting</h1>
              <Badge variant={isPublished ? 'success' : 'secondary'}>{isPublished ? 'Published' : 'Unpublished'}</Badge>
            </div>
            <p className="text-copy-14 text-muted-foreground">
              Manage the page candidates see and when it accepts applications.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {isPublished && job.canonicalUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={job.canonicalUrl} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOutIcon data-icon="inline-start" />
                  View posting
                </a>
              </Button>
            )}

            {isPublished && job.canonicalUrl && (
              <Button variant="outline" size="sm" onClick={handleCopyPostingLink}>
                <CopyIcon data-icon="inline-start" />
                Copy link
              </Button>
            )}

            {isPublished && canUnpublishPosting ? (
              <Button variant="outline" size="sm" onClick={() => setUnpublishOpen(true)}>
                Unpublish
              </Button>
            ) : null}

            {!isPublished && canPublishPosting ? (
              <Button size="sm" onClick={() => setPublishOpen(true)} disabled={!canOpenPublishDialog}>
                Publish
              </Button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-surface-border bg-card bg-clip-padding">
          <section className="border-b border-separator p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-heading-16">Description</h2>
                <p className="mt-1 truncate text-copy-13 text-muted-foreground">
                  {posting.descriptionMarkdown ? 'Ready for candidates' : 'No description'}
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setDescriptionDialogOpen(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit description
                </Button>
              )}
            </div>
          </section>

          <section className="border-b border-separator p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-heading-16">Application form</h2>
                <p className="mt-1 truncate text-copy-13 text-muted-foreground">
                  {posting.form?.title ?? 'No form selected'}
                </p>
              </div>
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
          </section>

          <section className="p-6">
            <div className="mb-5 space-y-1">
              <h2 className="text-heading-16">Application capacity</h2>
              <p className="text-copy-13 text-muted-foreground">
                {applicationCountLabel(posting.completedApplicationCount, posting.applicationCapacity)}
              </p>
            </div>
            <div className="space-y-5">
              <ApplicationCapacityControl
                value={applicationCapacity}
                onChange={setApplicationCapacity}
                disabled={!canEdit || updatePosting.isPending}
              />
              {canEdit && capacityChanged && (
                <Button size="sm" onClick={handleSaveCapacity} disabled={!canSaveCapacity}>
                  {updatePosting.isPending && <Spinner data-icon="inline-start" />}
                  {updatePosting.isPending ? 'Saving...' : 'Save capacity'}
                </Button>
              )}
            </div>
          </section>
        </div>
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

      <PublishJobDialogV2
        orgId={orgId}
        jobId={jobId}
        jobTitle={job.title ?? 'Untitled Position'}
        open={publishOpen}
        onOpenChange={setPublishOpen}
      />

      <JobDescriptionEditorDialog
        descriptionMarkdown={posting.descriptionMarkdown}
        isPending={updatePosting.isPending}
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
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </PageContainer>
  );
}
