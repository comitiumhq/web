import type { TipTapDoc } from '@comitium/schemas/common';
import type { JobPosting } from '@comitium/schemas/jobs';
import { MAX_POSTING_SKILLS, type SkillRequirement } from '@comitium/schemas/skills';
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
import { getMyOrigin } from '@/config/site';
import {
  usePublishJobPosting,
  useReleaseCommitmentFunds,
  useUnpublishJobPosting,
  useUpdateJobPosting,
} from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { toSkillSelections } from '@/lib/jobs/skills';
import { Permission } from '@/lib/schemas/org';

import { isValidApplicationCapacity } from './application-capacity';
import { ApplicationCapacityControl } from './application-capacity-control';
import { ApplicationFormDialog } from './application-form-dialog';
import { PostingActionsMenu } from './posting-actions-menu';
import { PostingDescriptionEditor } from './posting-description-editor';
import { type PostingTab, PostingTabs } from './posting-tabs';
import { PublishValidationBanner, type PublishValidationError } from './publish-validation-banner';
import { ResponseCommitmentStatus } from './response-commitment-status';
import { SkillsEditor } from './skills-editor';

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
  const [skillsDraft, setSkillsDraft] = useState<SkillRequirement[] | null>(null);
  const [descriptionHasChanged, setDescriptionHasChanged] = useState(false);
  const [activeTab, setActiveTab] = useState<PostingTab>('description');
  const [publishErrors, setPublishErrors] = useState<PublishValidationError<PostingTab>[]>([]);
  const [applicationFormDialogOpen, setApplicationFormDialogOpen] = useState(false);
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
  const postingAllowsPublication = !isPostingPublished && job.status === 'open' && !isCommitmentFinalizing;

  const canEdit = !isJobClosed && canOnJob(Permission.JOB_EDIT);
  const canPublishPosting = canOnJob(Permission.JOB_PUBLISH);
  const canUnpublishPosting = canOnJob(Permission.JOB_UNPUBLISH);
  const canReleaseFunds = canOnJob(Permission.JOB_CLOSE);
  const canPublish = canPublishPosting && postingAllowsPublication && !permissionsLoading;

  const currentDescription = descriptionHasChanged ? descriptionDraft : posting.description;
  const currentSkills = skillsDraft ?? posting.skills;
  const capacityHasChanged = applicationCapacity !== posting.applicationCapacity;
  const skillsHaveChanged = skillsDraft !== null;
  const hasRetiredSkills = currentSkills.some((skill) => skill.status === 'retired');
  const hasUnsavedPostingChanges = descriptionHasChanged || skillsHaveChanged || capacityHasChanged;

  const isSavingPosting = updatePosting.isPending;
  const canSaveChanges = canEdit && !isSavingPosting;
  const canSaveDescription =
    canSaveChanges && descriptionHasChanged && Boolean(richTextToPlainText(currentDescription));
  const canSaveSkills =
    canSaveChanges && skillsHaveChanged && !hasRetiredSkills && currentSkills.length <= MAX_POSTING_SKILLS;
  const canSaveCapacity = canSaveChanges && capacityHasChanged && isValidApplicationCapacity(applicationCapacity);

  const candidatePostingUrl = getCandidatePostingUrl(job.canonicalUrl);

  const handleCopyPostingLink = async () => {
    if (!candidatePostingUrl) {
      return;
    }

    await navigator.clipboard.writeText(candidatePostingUrl);
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

  const handleSaveSkills = async () => {
    if (!canSaveSkills) {
      return;
    }

    await updatePosting.mutateAsync({
      expectedVersion: posting.version,
      skills: toSkillSelections(currentSkills),
    });
    setSkillsDraft(null);
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
            {isPostingPublished && candidatePostingUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={candidatePostingUrl} target="_blank" rel="noopener noreferrer">
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
                canCopyLink={candidatePostingUrl !== null}
                canUnpublish={canUnpublishPosting}
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
                disabled={isSavingPosting}
              />
              {canEdit && descriptionHasChanged && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void handleSaveDescription()} disabled={!canSaveDescription}>
                    {isSavingPosting && <Spinner data-icon="inline-start" />}
                    {isSavingPosting ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              )}
            </div>
          }
          skills={
            <div className="space-y-3">
              <SkillsEditor value={currentSkills} onChange={setSkillsDraft} disabled={!canEdit || isSavingPosting} />
              {skillsHaveChanged && hasRetiredSkills && (
                <p className="text-copy-13 text-destructive">Remove or replace retired skills before saving.</p>
              )}
              {canEdit && skillsHaveChanged && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void handleSaveSkills()} disabled={!canSaveSkills}>
                    {isSavingPosting && <Spinner data-icon="inline-start" />}
                    {isSavingPosting ? 'Saving...' : 'Save skills'}
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
            <div className="space-y-3">
              <Card>
                <CardContent>
                  <ApplicationCapacityControl
                    value={applicationCapacity}
                    onChange={(value) => {
                      setApplicationCapacity(value);
                      setPublishErrors([]);
                    }}
                    disabled={!canEdit || isSavingPosting}
                  />
                </CardContent>
              </Card>
              {canEdit && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveCapacity} disabled={!canSaveCapacity}>
                    {isSavingPosting && <Spinner data-icon="inline-start" />}
                    {isSavingPosting ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              )}
            </div>
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

function getCandidatePostingUrl(canonicalUrl: string | null): string | null {
  if (!canonicalUrl) {
    return null;
  }

  const candidateOrigin = getMyOrigin();
  const canonical = new URL(canonicalUrl, candidateOrigin);

  return new URL(`${canonical.pathname}${canonical.search}${canonical.hash}`, candidateOrigin).toString();
}
