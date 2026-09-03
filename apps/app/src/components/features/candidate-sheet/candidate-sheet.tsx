import { useSession } from '@comitium/auth/use-session';
import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { useCallback } from 'react';
import { FeedbackSubmissionSheet } from '@/components/features/feedback-submission';
import { DirectBookingLinkDialog } from '@/components/features/interviews/direct-booking-link-dialog';
import { ScheduleInterviewDialog } from '@/components/features/interviews/schedule-dialog';
import { useQueryDuplicateApplicationAttempts } from '@/hooks/queries/use-query-duplicate-application-attempts';
import { useQueryOtherApplications } from '@/hooks/queries/use-query-other-applications';
import type { InterviewStage } from '@/lib/schemas/pipeline';

import { CandidateSheetHeader } from './candidate-sheet-header';
import { CandidateSheetShell, CandidateSheetSkeleton } from './candidate-sheet-shell';
import { CandidateSheetWorkspace } from './candidate-sheet-workspace';
import { ConsiderationRail } from './considerations/consideration-rail';
import { ConsiderationSelector } from './considerations/consideration-selector';
import { getMergedConsiderationTotal, useConsiderationSelection } from './considerations/use-consideration-selection';
import { useSheetNavigation } from './hooks/use-sheet-navigation';
import { useCandidateSheetModel } from './model/use-candidate-sheet-model';
import { CandidateOverview } from './overview';
import { CandidateActivities } from './progress';
import { CandidateResume } from './resume';
import { ArchiveApplicationSheet } from './workflows/archive-application-sheet';
import { EmailSheet } from './workflows/email-sheet';
import { useCandidateSheetWorkflows } from './workflows/use-candidate-sheet-workflows';

interface CandidateSheetProps {
  applicationId: string | null;
  jobId: string;
  jobOnChainId: number | null;
  orgId: string;
  stages?: InterviewStage[];
  jobTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (applicationId: string) => void;
  onApplicationSwitch?: (app: OtherApplicationSummary) => void;
  candidateIds?: string[];
}

export function CandidateSheet({
  applicationId,
  jobId,
  jobOnChainId,
  orgId,
  stages,
  jobTitle,
  open,
  onOpenChange,
  onNavigate,
  onApplicationSwitch,
  candidateIds,
}: CandidateSheetProps) {
  const { user } = useSession();
  const {
    application,
    isLoadingApplication,
    vaultKeyData,
    wrappedVaultKey,
    formSubmission,
    decryptedData,
    formDecryptionError,
    isDecryptingForm,
    retryFormDecryption,
    isLoadingFormSubmission,
    isFormSubmissionError,
    refetchFormSubmission,
    decryptedEmails,
    emailDecryptionError,
    isDecryptingEmails,
    retryEmailDecryption,
    isLoadingEmails,
    isEmailsError,
    refetchEmails,
    isLoadingEmailDecryptionKey,
    isEmailDecryptionKeyError,
    refetchEmailDecryptionKey,
    fetchNextEmailsPage,
    hasNextEmailsPage,
    isFetchingNextEmailsPage,
    isFetchNextEmailsPageError,
    decryptedFileMeta,
    pdfData,
    isResumeLoading,
    resumeError,
    downloadResume,
    downloadApplicationFile,
    downloadingQuestionId,
    decryptedProfile,
    isLoadingProfile,
    hasEncryptedProfile,
    profileQueryError,
    profileDecryptionError,
    retryProfileQuery,
    candidateFirstName,
    candidateName,
    decryptedEmail,
    effectiveJobId,
    resolvedStages,
    displayName,
  } = useCandidateSheetModel({
    applicationId,
    jobId,
    orgId,
    stages,
    open,
  });
  const effectiveJobTitle = application?.considerationContext.job.title ?? jobTitle;
  const effectiveJobOnChainId = application && effectiveJobId !== jobId ? null : jobOnChainId;

  const {
    archiveSheetOpen,
    emailSheetOpen,
    scheduleOpen,
    directBookingOpen,
    activityPrefill,
    emailActivityPrefill,
    feedbackSheetSource,
    isTerminalActionPending,
    isSending,
    restoreStageName,
    isChangingStage,
    handleStageChange,
    handleOpenArchive,
    handleArchiveSheetOpenChange,
    handleArchiveSubmit,
    handleReopenToStage,
    handleOpenEmail,
    handleOpenSchedule,
    handleOpenDirectBookingLink,
    handleScheduleActivity,
    handleCreateDirectBookingLinkFromActivity,
    handleSendFromActivity,
    handleReviewActivity,
    handleSubmitInterviewFeedback,
    handleReviewSheetOpenChange,
    handleScheduleOpenChange,
    handleDirectBookingOpenChange,
    handleEmailSheetOpenChange,
    handleEmailSubmit,
  } = useCandidateSheetWorkflows({
    application,
    orgId,
    jobId: effectiveJobId,
    resolvedStages,
    applicantEmail: decryptedEmail,
    vaultPublicKey: vaultKeyData?.vaultPublicKey ?? null,
    vaultKeyVersion: vaultKeyData?.keyVersion ?? null,
  });

  const { hasPrev, hasNext, handlePrev, handleNext } = useSheetNavigation(applicationId, candidateIds, onNavigate);
  const sheetPager = { hasPrev, hasNext, onPrev: handlePrev, onNext: handleNext };

  const {
    applications: otherApplications,
    total: otherApplicationsTotal,
    isLoading: isLoadingOtherApplications,
    isError: isOtherApplicationsError,
    isFetching: isFetchingOtherApplications,
    refetch: refetchOtherApplications,
    fetchNextPage: fetchNextOtherApplications,
    hasNextPage: hasNextOtherApplicationsPage,
    isFetchingNextPage: isFetchingNextOtherApplicationsPage,
    isFetchNextPageError: isFetchNextOtherApplicationsPageError,
  } = useQueryOtherApplications(application?.id ?? applicationId);

  const {
    attempts: duplicateAttempts,
    total: duplicateAttemptsTotal,
    isLoading: isLoadingDuplicateAttempts,
    isError: isDuplicateAttemptsError,
    isFetching: isFetchingDuplicateAttempts,
    refetch: refetchDuplicateAttempts,
    fetchNextPage: fetchNextDuplicateAttempts,
    hasNextPage: hasNextDuplicateAttemptsPage,
    isFetchingNextPage: isFetchingNextDuplicateAttemptsPage,
    isFetchNextPageError: isFetchNextDuplicateAttemptsPageError,
  } = useQueryDuplicateApplicationAttempts(
    application?.id ?? applicationId,
    Boolean(application?.duplicateAttemptCount),
  );

  const { considerations, handleApplicationClick } = useConsiderationSelection({
    application,
    otherApplications,
    jobId: effectiveJobId,
    jobOnChainId: effectiveJobOnChainId,
    jobTitle: effectiveJobTitle,
    currentStageName: restoreStageName,
    onApplicationSwitch,
    onNavigate,
  });

  const handleDuplicateAttemptClick = useCallback(
    (duplicateApplicationId: string) => {
      const attempt = duplicateAttempts.find((item) => item.id === duplicateApplicationId);

      if (!attempt) {
        return;
      }

      if (onApplicationSwitch) {
        const stageName = resolvedStages?.find((stage) => stage.id === attempt.currentStageId)?.name ?? null;

        onApplicationSwitch({
          id: attempt.id,
          jobId: effectiveJobId,
          jobOnChainId: effectiveJobOnChainId,
          jobTitle: effectiveJobTitle,
          appliedAt: attempt.appliedAt,
          currentStageId: attempt.currentStageId,
          terminalOutcome: attempt.terminalOutcome,
          terminalOutcomeAt: attempt.terminalOutcomeAt,
          currentStageName: stageName,
          isResponded: attempt.isResponded,
          archivedAt: null,
          duplicateAttemptCount: 0,
        });

        return;
      }

      onNavigate?.(duplicateApplicationId);
    },
    [
      duplicateAttempts,
      effectiveJobId,
      effectiveJobOnChainId,
      effectiveJobTitle,
      onApplicationSwitch,
      onNavigate,
      resolvedStages,
    ],
  );

  const handleOpenPrimaryApplication = useCallback(() => {
    if (application?.duplicateOfApplicationId) {
      handleApplicationClick(application.duplicateOfApplicationId);
    }
  }, [application?.duplicateOfApplicationId, handleApplicationClick]);

  const handleRetryEmails = useCallback(() => refetchEmails(), [refetchEmails]);

  const handleRetryEmailDecryption = useCallback(() => retryEmailDecryption(), [retryEmailDecryption]);

  const handleRetryEmailDecryptionKey = useCallback(() => refetchEmailDecryptionKey(), [refetchEmailDecryptionKey]);

  const handleRetryFormSubmission = useCallback(() => refetchFormSubmission(), [refetchFormSubmission]);

  const handleLoadMoreEmails = useCallback(() => fetchNextEmailsPage(), [fetchNextEmailsPage]);
  const handleRetryOtherApplications = useCallback(() => refetchOtherApplications(), [refetchOtherApplications]);
  const handleRetryDuplicateAttempts = useCallback(() => refetchDuplicateAttempts(), [refetchDuplicateAttempts]);

  if (!application) {
    if (isLoadingApplication && open) {
      return (
        <CandidateSheetShell
          open={open}
          title="Loading candidate"
          description="Loading the candidate workspace."
          pager={sheetPager}
          onOpenChange={onOpenChange}
        >
          <CandidateSheetSkeleton />
        </CandidateSheetShell>
      );
    }

    return null;
  }

  const applicationDisplayName = displayName ?? 'Candidate';
  const candidateSubtitle =
    decryptedProfile?.currentCompany?.trim() || decryptedProfile?.currentTitle?.trim() || decryptedEmail;
  const { actionState, capabilities, currentActivities, hiringTeam } = application.considerationContext;
  const headerPending = { isChangingStage, isTerminalActionPending };
  const currentUserId = user?.id ?? '';
  const isOnHiringTeam = hiringTeam.some((member) => member.userId === currentUserId);

  const sidebarAccess = {
    canManageNotes: capabilities.candidate.canCreateNote,
    canProjectFormFields: capabilities.candidate.canEditProfile,
    canModerateFeedback: capabilities.consideration.canModerateFeedback,
    canSubmitFeedback: capabilities.consideration.canSubmitFeedback,
    isOnHiringTeam,
  };

  const emailCollection = {
    data: decryptedEmails,
    decryptionError: emailDecryptionError,
    isDecrypting: isDecryptingEmails,
    isLoading: isLoadingEmails,
    isError: isEmailsError,
    isLoadingDecryptionKey: isLoadingEmailDecryptionKey,
    isDecryptionKeyError: isEmailDecryptionKeyError,
    hasNextPage: hasNextEmailsPage,
    isFetchingNextPage: isFetchingNextEmailsPage,
    isFetchNextPageError: isFetchNextEmailsPageError,
    onRetryQuery: handleRetryEmails,
    onRetryDecryption: handleRetryEmailDecryption,
    onRetryDecryptionKey: handleRetryEmailDecryptionKey,
    onLoadMore: handleLoadMoreEmails,
  };

  const totalConsiderations = getMergedConsiderationTotal(otherApplications, otherApplicationsTotal, application.id);
  const totalDuplicateAttempts = duplicateAttemptsTotal || application.duplicateAttemptCount;

  const considerationRail = (
    <div className="min-h-0 min-w-0">
      <ConsiderationRail
        orgId={orgId}
        currentApplicationId={application.id}
        considerations={considerations}
        totalConsiderations={totalConsiderations}
        isInitialLoading={isLoadingOtherApplications}
        isInitialError={isOtherApplicationsError && otherApplications.length === 0}
        isRetrying={isFetchingOtherApplications}
        hasNextPage={hasNextOtherApplicationsPage}
        isFetchingNextPage={isFetchingNextOtherApplicationsPage}
        isFetchNextPageError={isFetchNextOtherApplicationsPageError}
        onLoadMore={fetchNextOtherApplications}
        onRetry={handleRetryOtherApplications}
        onApplicationClick={handleApplicationClick}
        duplicateAttempts={duplicateAttempts}
        totalDuplicateAttempts={totalDuplicateAttempts}
        isInitialDuplicateAttemptsLoading={isLoadingDuplicateAttempts}
        isInitialDuplicateAttemptsError={isDuplicateAttemptsError && duplicateAttempts.length === 0}
        isRetryingDuplicateAttempts={isFetchingDuplicateAttempts}
        hasNextDuplicateAttemptsPage={Boolean(hasNextDuplicateAttemptsPage)}
        isFetchingNextDuplicateAttemptsPage={isFetchingNextDuplicateAttemptsPage}
        isFetchNextDuplicateAttemptsPageError={isFetchNextDuplicateAttemptsPageError}
        onLoadMoreDuplicateAttempts={fetchNextDuplicateAttempts}
        onRetryDuplicateAttempts={handleRetryDuplicateAttempts}
        onDuplicateAttemptClick={handleDuplicateAttemptClick}
      />
    </div>
  );

  const considerationSelector = (
    <ConsiderationSelector
      currentApplicationId={application.id}
      considerations={considerations}
      duplicateAttempts={duplicateAttempts}
      totalDuplicateAttempts={totalDuplicateAttempts}
      isInitialLoading={isLoadingOtherApplications}
      isInitialError={isOtherApplicationsError && otherApplications.length === 0}
      isRetrying={isFetchingOtherApplications}
      hasNextConsiderationsPage={hasNextOtherApplicationsPage}
      isFetchingNextConsiderationsPage={isFetchingNextOtherApplicationsPage}
      isFetchNextConsiderationsPageError={isFetchNextOtherApplicationsPageError}
      hasNextDuplicateAttemptsPage={Boolean(hasNextDuplicateAttemptsPage)}
      isFetchingNextDuplicateAttemptsPage={isFetchingNextDuplicateAttemptsPage}
      isFetchNextDuplicateAttemptsPageError={isFetchNextDuplicateAttemptsPageError}
      isInitialDuplicateAttemptsLoading={isLoadingDuplicateAttempts}
      isInitialDuplicateAttemptsError={isDuplicateAttemptsError && duplicateAttempts.length === 0}
      isRetryingDuplicateAttempts={isFetchingDuplicateAttempts}
      onConsiderationChange={handleApplicationClick}
      onDuplicateAttemptChange={handleDuplicateAttemptClick}
      onLoadMoreConsiderations={fetchNextOtherApplications}
      onRetryConsiderations={handleRetryOtherApplications}
      onLoadMoreDuplicateAttempts={fetchNextDuplicateAttempts}
      onRetryDuplicateAttempts={handleRetryDuplicateAttempts}
    />
  );

  const overview = (
    <CandidateOverview
      application={application}
      orgId={orgId}
      decryptedProfile={decryptedProfile}
      isLoadingProfile={isLoadingProfile}
      hasEncryptedProfile={hasEncryptedProfile}
      profileQueryError={profileQueryError}
      profileDecryptionError={profileDecryptionError}
      onRetryProfile={retryProfileQuery}
      vaultPublicKey={vaultKeyData?.vaultPublicKey ?? null}
      vaultKeyVersion={vaultKeyData?.keyVersion ?? null}
    />
  );

  const activities = (
    <CandidateActivities
      applicationId={application.id}
      orgId={orgId}
      currentStageId={application.currentStageId}
      jobId={effectiveJobId}
      capabilities={capabilities.consideration}
      actionState={actionState}
      currentActivities={currentActivities}
      onSchedule={handleOpenSchedule}
      onCreateDirectBookingLink={handleOpenDirectBookingLink}
      onScheduleActivity={handleScheduleActivity}
      onCreateDirectBookingLinkFromActivity={handleCreateDirectBookingLinkFromActivity}
      onSendFromActivity={handleSendFromActivity}
      onReviewActivity={handleReviewActivity}
      onSubmitInterviewFeedback={handleSubmitInterviewFeedback}
    />
  );

  const resume = (
    <CandidateResume
      orgId={orgId}
      hasResume={application.hasResume}
      pdfData={pdfData}
      isLoading={isResumeLoading}
      error={resumeError}
      onDownload={downloadResume}
    />
  );

  const collaboration = {
    applicationId: application.id,
    candidateId: application.candidateId ?? null,
    orgId,
    jobId: effectiveJobId,
    currentStageId: application.currentStageId,
    candidateProfile: decryptedProfile,
    criterionSummary: application.criterionSummary,
    criterionAssessments: application.criterionAssessments,
    reviewStatus: application.reviewStatus,
    emails: emailCollection,
    form: {
      submission: formSubmission ?? null,
      answers: decryptedData,
      fileMeta: decryptedFileMeta,
      decryptionError: formDecryptionError,
      isDecrypting: isDecryptingForm,
      isLoading: isLoadingFormSubmission,
      isError: isFormSubmissionError,
      downloadingQuestionId,
      onRetryQuery: handleRetryFormSubmission,
      onRetryDecryption: retryFormDecryption,
      onDownloadAttachment: downloadApplicationFile,
    },
    currentUserId,
    vaultPublicKey: vaultKeyData?.vaultPublicKey ?? null,
    vaultKeyVersion: vaultKeyData?.keyVersion ?? null,
    access: sidebarAccess,
    onReviewActivity: handleReviewActivity,
    onSubmitInterviewFeedback: handleSubmitInterviewFeedback,
  };

  return (
    <>
      <CandidateSheetShell
        open={open}
        title={applicationDisplayName}
        description="Candidate workspace with applications, activities, forms, files, notes, feedback, and emails."
        pager={sheetPager}
        onOpenChange={onOpenChange}
      >
        <CandidateSheetHeader
          orgId={orgId}
          candidateId={application.candidateId}
          displayName={applicationDisplayName}
          subtitle={candidateSubtitle}
          isResponded={application.isResponded}
          responseDeadline={application.responseDeadline ?? null}
          appliedAt={application.appliedAt ?? null}
          currentStageId={application.currentStageId}
          currentStageEnteredAt={application.currentStageEnteredAt}
          interviewStatus={application.interviewStatus}
          interviewScheduledAt={application.interviewScheduledAt}
          stages={resolvedStages ?? null}
          onStageChange={handleStageChange}
          onEmail={handleOpenEmail}
          onArchive={handleOpenArchive}
          onReopenToStage={handleReopenToStage}
          terminalOutcome={application.terminalOutcome}
          archiveReasonLabel={application.archiveReasonLabel}
          pending={headerPending}
          capabilities={capabilities}
          tagIds={application.tagIds}
          reviewStatus={application.reviewStatus}
          duplicateOfApplicationId={application.duplicateOfApplicationId}
          onOpenPrimaryApplication={handleOpenPrimaryApplication}
        />

        <CandidateSheetWorkspace
          considerationRail={considerationRail}
          considerationSelector={considerationSelector}
          activities={activities}
          overview={overview}
          resume={resume}
          collaboration={collaboration}
        />
      </CandidateSheetShell>

      <ArchiveApplicationSheet
        open={archiveSheetOpen}
        onOpenChange={handleArchiveSheetOpenChange}
        isPending={isTerminalActionPending}
        onSubmit={handleArchiveSubmit}
        applicationId={application.id}
        orgId={orgId}
        candidateEmail={decryptedEmail}
        candidateFirstName={candidateFirstName}
        jobTitle={effectiveJobTitle}
        isResponded={application.isResponded}
        canSendEmail={capabilities.consideration.canSendEmail}
      />

      <EmailSheet
        open={emailSheetOpen}
        onOpenChange={handleEmailSheetOpenChange}
        isSending={isSending}
        onSubmit={handleEmailSubmit}
        applicationId={application.id}
        orgId={orgId}
        candidateEmail={decryptedEmail}
        candidateFirstName={candidateFirstName}
        jobTitle={effectiveJobTitle}
        activityId={emailActivityPrefill?.activityId}
        preselectedTemplateId={emailActivityPrefill?.emailTemplateId}
      />

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={handleScheduleOpenChange}
        applicationId={application.id}
        orgId={orgId}
        currentStageId={application.currentStageId}
        candidateEmail={decryptedEmail}
        prefillInterviewId={activityPrefill?.interviewId ?? null}
        prefillDefaultInterviewers={activityPrefill?.defaultInterviewers ?? null}
      />

      <DirectBookingLinkDialog
        open={directBookingOpen}
        onOpenChange={handleDirectBookingOpenChange}
        applicationId={application.id}
        orgId={orgId}
        currentStageId={application.currentStageId}
        candidateEmail={decryptedEmail}
        candidateFirstName={candidateFirstName}
        jobTitle={effectiveJobTitle}
        vaultPublicKey={vaultKeyData?.vaultPublicKey ?? null}
        vaultKeyVersion={vaultKeyData?.keyVersion ?? null}
        prefillInterviewId={activityPrefill?.interviewId ?? null}
        prefillDefaultInterviewers={activityPrefill?.defaultInterviewers ?? null}
      />

      <FeedbackSubmissionSheet
        open={feedbackSheetSource !== null}
        onOpenChange={handleReviewSheetOpenChange}
        applicationId={application.id}
        orgId={orgId}
        source={feedbackSheetSource}
        currentUserId={user?.id}
        vaultPublicKey={vaultKeyData?.vaultPublicKey ?? null}
        vaultKeyVersion={vaultKeyData?.keyVersion ?? null}
        wrappedVaultKey={wrappedVaultKey}
        candidateName={candidateName}
      />
    </>
  );
}
