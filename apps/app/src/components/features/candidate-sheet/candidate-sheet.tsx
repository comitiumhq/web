import { useSession } from '@comitium/auth/use-session';
import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { type ComponentProps, useCallback } from 'react';
import { FeedbackSubmissionSheet } from '@/components/features/feedback-submission';
import { DirectBookingLinkDialog } from '@/components/features/interviews/direct-booking-link-dialog';
import { ScheduleInterviewDialog } from '@/components/features/interviews/schedule-dialog';
import { useQueryOtherApplications } from '@/hooks/queries/use-query-other-applications';
import type { InterviewStage } from '@/lib/schemas/pipeline';
import { CandidateRecordSheet } from './candidate-record-sheet';
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
  orgId: string;
  stages?: InterviewStage[];
  jobTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (applicationId: string) => void;
  onApplicationSwitch?: (app: OtherApplicationSummary) => void;
  candidateIds?: string[];
}

interface CandidateRecordEntry extends ComponentProps<typeof CandidateRecordSheet> {
  applicationId: null;
}

type CandidateSheetEntryProps = CandidateSheetProps | CandidateRecordEntry;

export function CandidateSheet(props: CandidateSheetEntryProps) {
  if ('candidateId' in props) {
    return (
      <CandidateRecordSheet
        candidateId={props.candidateId}
        orgId={props.orgId}
        open={props.open}
        onOpenChange={props.onOpenChange}
      />
    );
  }

  return <ApplicationCandidateSheet {...props} />;
}

function ApplicationCandidateSheet({
  applicationId,
  jobId,
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
    vaultAccess,
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
    profileRevision,
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

  const { considerations, handleApplicationClick } = useConsiderationSelection({
    application,
    otherApplications,
    jobId: effectiveJobId,
    jobTitle: effectiveJobTitle,
    currentStageName: restoreStageName,
    onApplicationSwitch,
    onNavigate,
  });

  const handleRetryEmails = useCallback(() => refetchEmails(), [refetchEmails]);
  const handleRetryEmailDecryption = useCallback(() => retryEmailDecryption(), [retryEmailDecryption]);
  const handleRetryEmailDecryptionKey = useCallback(() => refetchEmailDecryptionKey(), [refetchEmailDecryptionKey]);
  const handleRetryFormSubmission = useCallback(() => refetchFormSubmission(), [refetchFormSubmission]);
  const handleLoadMoreEmails = useCallback(() => fetchNextEmailsPage(), [fetchNextEmailsPage]);
  const handleRetryOtherApplications = useCallback(() => refetchOtherApplications(), [refetchOtherApplications]);

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

  const { actionState, capabilities, currentActivities, hiringTeam, stageActivities } =
    application.considerationContext;

  const headerPending = { isChangingStage, isTerminalActionPending };
  const currentUserId = user?.id ?? '';
  const isOnHiringTeam = hiringTeam.some((member) => member.userId === currentUserId);

  const sidebarAccess = {
    canManageNotes: capabilities.candidate.canCreateNote,
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
      />
    </div>
  );

  const considerationSelector = (
    <ConsiderationSelector
      currentApplicationId={application.id}
      considerations={considerations}
      isInitialLoading={isLoadingOtherApplications}
      isInitialError={isOtherApplicationsError && otherApplications.length === 0}
      isRetrying={isFetchingOtherApplications}
      hasNextConsiderationsPage={hasNextOtherApplicationsPage}
      isFetchingNextConsiderationsPage={isFetchingNextOtherApplicationsPage}
      isFetchNextConsiderationsPageError={isFetchNextOtherApplicationsPageError}
      onConsiderationChange={handleApplicationClick}
      onLoadMoreConsiderations={fetchNextOtherApplications}
      onRetryConsiderations={handleRetryOtherApplications}
    />
  );

  const overview = (
    <CandidateOverview
      application={application}
      orgId={orgId}
      decryptedProfile={decryptedProfile}
      profileRevision={profileRevision}
      isLoadingProfile={isLoadingProfile}
      hasEncryptedProfile={hasEncryptedProfile}
      profileQueryError={profileQueryError}
      profileDecryptionError={profileDecryptionError}
      onRetryProfile={retryProfileQuery}
      vaultPublicKey={vaultKeyData?.vaultPublicKey ?? null}
      vaultKeyVersion={vaultKeyData?.keyVersion ?? null}
      vaultAccess={vaultAccess}
    />
  );

  const activities = (
    <CandidateActivities
      applicationId={application.id}
      orgId={orgId}
      capabilities={capabilities.consideration}
      actionState={actionState}
      stageActivities={stageActivities}
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
    candidateProfile: decryptedProfile,
    criterionSummary: application.criterionSummary,
    criterionAssessments: application.criterionAssessments,
    processing: application.processing,
    reviewStatus: application.reviewStatus,
    stageActivities,
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
        prefillActivityId={activityPrefill?.activityId ?? null}
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
        prefillActivityId={activityPrefill?.activityId ?? null}
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
        vaultAccess={vaultAccess}
        candidateName={candidateName}
      />
    </>
  );
}
