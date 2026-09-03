import type { PublicEncryptionKey } from '@comitium/crypto';
import type { CriteriaAssessment, CriterionSummary, ReviewStatus } from '@comitium/schemas/applications';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { useCallback } from 'react';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import type { InterviewEventRef } from '@/lib/interviews/feedback';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';
import { cn } from '@/lib/utils';

import { WorkspaceTabsNavigation } from '../workspace-tabs-navigation';
import { type EmailCollectionState, EmailsTab } from './emails';
import { FeedTab } from './feed';
import { FeedbackTab } from './feedback';
import type { FeedbackAccessState } from './feedback/types';
import { type ApplicationFormState, FormsTab } from './forms';
import { NotesTab } from './notes';
import { useDecryptedNotes } from './notes/use-decrypted-notes';
import { useNoteActions } from './notes/use-note-actions';

export type CandidateCollaborationTab = 'feed' | 'notes' | 'feedback' | 'emails' | 'forms';
type CandidateCollaborationVariant = 'panel' | 'compact';

interface CandidateCollaborationAccess extends FeedbackAccessState {
  canManageNotes: boolean;
  canProjectFormFields: boolean;
}

export interface CandidateCollaborationProps {
  applicationId: string | null;
  candidateId: string | null;
  orgId: string;
  jobId: string;
  currentStageId: string | null;
  candidateProfile: CandidateProfile | null;
  currentUserId: string;
  criterionSummary: CriterionSummary | null;
  criterionAssessments: CriteriaAssessment[];
  reviewStatus: ReviewStatus;
  emails: EmailCollectionState;
  form: ApplicationFormState;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  access: CandidateCollaborationAccess;
  activeTab: CandidateCollaborationTab;
  variant: CandidateCollaborationVariant;
  onTabChange: (tab: CandidateCollaborationTab) => void;
  onReviewActivity: ((activity: ApplicationReviewActivity) => void) | null;
  onSubmitInterviewFeedback: ((event: InterviewEventRef) => void) | null;
}

export function CandidateCollaboration({
  applicationId,
  candidateId,
  orgId,
  jobId,
  currentStageId,
  candidateProfile,
  currentUserId,
  criterionSummary,
  criterionAssessments,
  reviewStatus,
  emails,
  form,
  vaultPublicKey,
  vaultKeyVersion,
  access,
  activeTab,
  variant,
  onTabChange,
  onReviewActivity,
  onSubmitInterviewFeedback,
}: CandidateCollaborationProps) {
  const {
    data: wrappedVaultKey,
    isLoading: isVaultKeyLoading,
    isError: isVaultKeyError,
  } = useQueryWrappedVaultKey(orgId);
  const {
    decryptedNotes,
    notes,
    total: notesTotal,
    isLoading: areNotesLoading,
    isError: isNotesError,
    refetch: refetchNotes,
    decryptingNoteIds,
    failedNoteIds,
    isVaultKeyError: isNotesVaultKeyError,
    hasNextPage: hasNextNotesPage,
    isFetchingNextPage: isFetchingNextNotesPage,
    isFetchNextPageError: isFetchNextNotesPageError,
    fetchNextPage: fetchNextNotesPage,
  } = useDecryptedNotes(applicationId, orgId, candidateId);
  const { handleDeleteNote, deletingNoteId } = useNoteActions(candidateId);
  const showNavigation = variant !== 'compact';
  const handleTabChange = useCallback(
    (value: string) => {
      if (isCandidateCollaborationTab(value)) {
        onTabChange(value);
      }
    },
    [onTabChange],
  );
  const handleRetryNotes = useCallback(() => {
    refetchNotes();
  }, [refetchNotes]);

  return (
    <div
      className={cn('flex h-full flex-col overflow-hidden bg-background', {
        'border-l border-border': variant === 'panel',
      })}
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="relative flex h-full flex-col">
        {showNavigation && (
          <WorkspaceTabsNavigation>
            <TabsList className="mx-4 my-3">
              <TabsTrigger value="feed" className="text-xs">
                Feed
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">
                Notes
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs">
                Feedback
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-xs">
                Emails
              </TabsTrigger>
              <TabsTrigger value="forms" className="text-xs">
                Forms
              </TabsTrigger>
            </TabsList>
          </WorkspaceTabsNavigation>
        )}

        <TabsContent value="feed" className="flex-1 min-h-0 mt-0">
          <FeedTab
            applicationId={applicationId}
            candidateId={candidateId}
            orgId={orgId}
            candidateProfile={candidateProfile}
            wrappedVaultKey={wrappedVaultKey}
            isVaultKeyLoading={isVaultKeyLoading}
            isVaultKeyError={isVaultKeyError && !wrappedVaultKey}
            decryptedNotes={decryptedNotes}
            decryptingNoteIds={decryptingNoteIds}
            failedNoteIds={failedNoteIds}
            currentUserId={currentUserId}
            canManageNotes={access.canManageNotes}
            onDeleteNote={handleDeleteNote}
            deletingNoteId={deletingNoteId}
          />
        </TabsContent>

        <TabsContent value="notes" className="flex-1 min-h-0 mt-0">
          <NotesTab
            orgId={orgId}
            candidateId={candidateId}
            currentUserId={currentUserId}
            vaultPublicKey={vaultPublicKey}
            vaultKeyVersion={vaultKeyVersion}
            canManageNotes={access.canManageNotes}
            decryptedNotes={decryptedNotes}
            notes={notes}
            totalNotes={notesTotal}
            isLoading={areNotesLoading}
            isError={isNotesError}
            decryptingNoteIds={decryptingNoteIds}
            failedNoteIds={failedNoteIds}
            isVaultKeyError={isNotesVaultKeyError}
            hasNextPage={hasNextNotesPage}
            isFetchingNextPage={isFetchingNextNotesPage}
            isFetchNextPageError={isFetchNextNotesPageError}
            onLoadMore={fetchNextNotesPage}
            onRetry={handleRetryNotes}
            onDeleteNote={handleDeleteNote}
            deletingNoteId={deletingNoteId}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-0 min-h-0 flex-1">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 pb-4 pt-20">
              <FeedbackTab
                applicationId={applicationId}
                candidateId={candidateId}
                orgId={orgId}
                jobId={jobId}
                currentStageId={currentStageId}
                currentUserId={currentUserId}
                criterionSummary={criterionSummary}
                criterionAssessments={criterionAssessments}
                reviewStatus={reviewStatus}
                access={access}
                wrappedVaultKey={wrappedVaultKey}
                onReviewActivity={onReviewActivity}
                onSubmitInterviewFeedback={onSubmitInterviewFeedback}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emails" className="flex-1 min-h-0 mt-0">
          <EmailsTab orgId={orgId} candidateProfile={candidateProfile} collection={emails} />
        </TabsContent>

        <TabsContent value="forms" className="flex-1 min-h-0 mt-0">
          <FormsTab orgId={orgId} form={form} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function isCandidateCollaborationTab(value: string): value is CandidateCollaborationTab {
  return value === 'feed' || value === 'notes' || value === 'feedback' || value === 'emails' || value === 'forms';
}
