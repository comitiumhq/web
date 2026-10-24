import type { TipTapDoc } from '@comitium/schemas/common';
import type { JobPosting } from '@comitium/schemas/jobs';
import type { SkillRequirement } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { PageContainer } from '@comitium/ui/page-container';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import { Spinner } from '@comitium/ui/spinner';
import { ExternalLinkIcon, PencilIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DraftSectionSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { getMyOrigin } from '@/config/site';
import { usePublishJobPosting, useUnpublishJobPosting } from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { Permission } from '@/lib/schemas/org';

import { AutosaveNavigationGuard } from '../editor-autosave/autosave-navigation-guard';
import { AutosaveStatus } from '../editor-autosave/autosave-status';
import { isValidApplicationCapacity } from './application-capacity';
import { ApplicationCapacityControl } from './application-capacity-control';
import { ApplicationFormDialog } from './application-form-dialog';
import { PostingActionsMenu } from './posting-actions-menu';
import { PostingDescriptionEditor } from './posting-description-editor';
import { type PostingTab, PostingTabs } from './posting-tabs';
import { PublishValidationBanner, type PublishValidationError } from './publish-validation-banner';
import { SkillsEditor } from './skills-editor';
import { usePostingAutosave } from './use-posting-autosave';

const UNPUBLISH_DESCRIPTION =
  'The Posting will be removed from job boards and stop accepting new applications. Existing candidates will remain in the Pipeline.';

interface JobPostingPageProps {
  orgId: string;
  jobId: string;
}

export function JobPostingPage({ orgId, jobId }: JobPostingPageProps) {
  const postingQuery = useQueryJobPosting(orgId, jobId);
  const summaryQuery = useQueryJobSummary(jobId);
  const publishPosting = usePublishJobPosting({ orgId, jobId });
  const unpublishPosting = useUnpublishJobPosting({ orgId, jobId });
  const { canOnJob, isLoading: permissionsLoading } = useJobPermissions(jobId);
  const [activeTab, setActiveTab] = useState<PostingTab>('description');
  const [publishErrors, setPublishErrors] = useState<PublishValidationError<PostingTab>[]>([]);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [applicationFormDialogOpen, setApplicationFormDialogOpen] = useState(false);

  const canEdit = Boolean(summaryQuery.data && summaryQuery.data.status !== 'closed' && canOnJob(Permission.JOB_EDIT));
  const {
    autosave,
    data: local,
    setData,
    version,
    isInitialized,
  } = usePostingAutosave(orgId, jobId, postingQuery.data, canEdit);

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

  if (!isInitialized) {
    return <DraftSectionSkeleton tab="posting" />;
  }

  const isPostingPublished = posting.status === 'published';
  const postingAllowsPublication = !isPostingPublished && job.status === 'open';

  const canPublishPosting = canOnJob(Permission.JOB_PUBLISH);
  const canUnpublishPosting = canOnJob(Permission.JOB_UNPUBLISH);
  const canPublish = canPublishPosting && postingAllowsPublication && !permissionsLoading;

  const currentDescription = local.description ?? null;
  const currentSkills = local.skills ?? [];
  const applicationCapacity = local.applicationCapacity ?? null;
  const hasRetiredSkills = currentSkills.some((skill) => skill.status === 'retired');
  const hasUnsavedPostingChanges = autosave.isDirty || autosave.isSaving;

  const candidatePostingUrl = getCandidatePostingUrl(job.canonicalUrl);

  const handleCopyPostingLink = async () => {
    if (!candidatePostingUrl) {
      return;
    }

    await navigator.clipboard.writeText(candidatePostingUrl);

    toast.success('Posting link copied');
  };

  const handleDescriptionChange = (description: TipTapDoc) => {
    setData((current) => ({ ...current, description }));
    setPublishErrors([]);
  };

  const handleSkillsChange = (skills: SkillRequirement[]) => {
    setData((current) => ({ ...current, skills }));
    autosave.saveImmediately();
  };

  const handleFormChange = (formId: string | null) => {
    setData((current) => ({ ...current, formId }));
    autosave.saveImmediately();
    setPublishErrors([]);
    setApplicationFormDialogOpen(false);
  };

  const handlePublish = () => {
    const errors = getPostingPublishErrors(posting);

    if (errors.length > 0) {
      setPublishErrors(errors);
      setActiveTab(errors[0].target);

      return;
    }

    setPublishErrors([]);
    publishPosting.mutate({ expectedVersion: version.current });
  };

  const handleUnpublish = async () => {
    if (!(await autosave.flush())) {
      return;
    }

    unpublishPosting.mutate(version.current, {
      onSuccess: () => setUnpublishOpen(false),
    });
  };

  return (
    <div className="h-full overflow-y-auto" onBlurCapture={() => void autosave.flush()}>
      <AutosaveNavigationGuard autosave={autosave} />
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEdit && <AutosaveStatus autosave={autosave} />}
            {isPostingPublished && candidatePostingUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={candidatePostingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon data-icon="inline-start" />
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
                canUnpublish={canUnpublishPosting && !hasUnsavedPostingChanges}
                onCopyLink={() => void handleCopyPostingLink()}
                onUnpublish={() => setUnpublishOpen(true)}
              />
            )}
          </div>
        </div>

        <PostingTabs
          value={activeTab}
          onValueChange={setActiveTab}
          description={
            <div className="space-y-3">
              <PostingDescriptionEditor
                content={currentDescription}
                onChange={canEdit ? handleDescriptionChange : undefined}
                readOnly={!canEdit}
              />
            </div>
          }
          skills={
            <div className="space-y-3">
              <SkillsEditor value={currentSkills} onChange={handleSkillsChange} disabled={!canEdit} />
              {hasRetiredSkills && (
                <p className="text-copy-13 text-destructive">Remove or replace retired skills before saving.</p>
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
                      setData((current) => ({ ...current, applicationCapacity: value }));
                      setPublishErrors([]);
                    }}
                    disabled={!canEdit}
                  />
                </CardContent>
              </Card>
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

      {canEdit && (
        <ApplicationFormDialog
          currentFormId={local.formId ?? null}
          jobId={jobId}
          open={applicationFormDialogOpen}
          orgId={orgId}
          onOpenChange={setApplicationFormDialogOpen}
          onSelect={handleFormChange}
        />
      )}
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
