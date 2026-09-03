import type { PublicEncryptionKey } from '@comitium/crypto';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { FeedbackSubmissionSource } from '@/components/features/feedback-submission';
import { useApplicationTerminalAction } from '@/hooks/mutations/use-application-terminal-action';
import type { InterviewEventRef } from '@/lib/interviews/feedback';
import type { ComposeEmailData } from '@/lib/schemas/emails';
import type { InterviewStageBase } from '@/lib/schemas/pipeline';
import type {
  ApplicationReviewActivity,
  DefaultInterviewer,
  ScheduleInterviewActivity,
  SendEmailActivity,
} from '@/lib/schemas/stage-activities';

import { useSendEmail } from '../hooks/use-send-email';
import { useStageActions } from '../hooks/use-stage-actions';
import type { ArchiveApplicationFormData } from './archive-application-sheet';

interface UseCandidateSheetWorkflowsParams {
  application: ApplicationApiResponse | null;
  orgId: string;
  jobId: string;
  resolvedStages: InterviewStageBase[] | undefined;
  applicantEmail: string | null;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
}

export function useCandidateSheetWorkflows({
  application,
  orgId,
  jobId,
  resolvedStages,
  applicantEmail,
  vaultPublicKey,
  vaultKeyVersion,
}: UseCandidateSheetWorkflowsParams) {
  const { sendEmail, isSending } = useSendEmail({
    application,
    orgId,
    jobId,
    vaultPublicKey,
    vaultKeyVersion,
    applicantEmail,
  });
  const stageActions = useStageActions(application, resolvedStages, jobId);
  const restoreStageName = stageActions.currentStage?.name ?? null;

  const [archiveSheetOpen, setArchiveSheetOpen] = useState(false);
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [directBookingOpen, setDirectBookingOpen] = useState(false);
  const [activityPrefill, setActivityPrefill] = useState<{
    interviewId: string;
    defaultInterviewers: DefaultInterviewer[] | null;
  } | null>(null);
  const [emailActivityPrefill, setEmailActivityPrefill] = useState<{
    emailTemplateId: string;
    activityId: string;
  } | null>(null);
  const [feedbackSheetSource, setFeedbackSheetSource] = useState<FeedbackSubmissionSource | null>(null);

  const handleTerminalActionCompleted = useCallback(() => {
    setArchiveSheetOpen(false);
  }, []);

  const { run: runTerminalAction, isPending: isTerminalActionPending } = useApplicationTerminalAction({
    onCompleted: handleTerminalActionCompleted,
  });

  const handleOpenArchive = useCallback(() => {
    setArchiveSheetOpen(true);
  }, []);

  const handleArchiveSheetOpenChange = useCallback((open: boolean) => {
    setArchiveSheetOpen(open);
  }, []);

  const handleOpenEmail = useCallback(() => {
    setEmailActivityPrefill(null);
    setEmailSheetOpen(true);
  }, []);

  const handleOpenSchedule = useCallback(() => {
    setActivityPrefill(null);
    setScheduleOpen(true);
  }, []);

  const handleScheduleActivity = useCallback((activity: ScheduleInterviewActivity) => {
    setActivityPrefill({
      interviewId: activity.interviewId,
      defaultInterviewers: activity.defaultInterviewers,
    });
    setScheduleOpen(true);
  }, []);

  const handleOpenDirectBookingLink = useCallback(() => {
    setActivityPrefill(null);
    setDirectBookingOpen(true);
  }, []);

  const handleCreateDirectBookingLinkFromActivity = useCallback((activity: ScheduleInterviewActivity) => {
    setActivityPrefill({
      interviewId: activity.interviewId,
      defaultInterviewers: activity.defaultInterviewers,
    });
    setDirectBookingOpen(true);
  }, []);

  const handleSendFromActivity = useCallback((activity: SendEmailActivity) => {
    setEmailActivityPrefill({
      emailTemplateId: activity.emailTemplateId,
      activityId: activity.id,
    });
    setEmailSheetOpen(true);
  }, []);

  const handleReviewActivity = useCallback(
    (activity: ApplicationReviewActivity) => {
      setFeedbackSheetSource({ kind: 'activity', activity, stageName: restoreStageName });
    },
    [restoreStageName],
  );

  const handleSubmitInterviewFeedback = useCallback((event: InterviewEventRef) => {
    setFeedbackSheetSource({ kind: 'event', eventId: event.id, interviewTitle: event.title });
  }, []);

  const handleReviewSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setFeedbackSheetSource(null);
    }
  }, []);

  const handleScheduleOpenChange = useCallback((open: boolean) => {
    setScheduleOpen(open);

    if (!open) {
      setActivityPrefill(null);
    }
  }, []);

  const handleDirectBookingOpenChange = useCallback((open: boolean) => {
    setDirectBookingOpen(open);

    if (!open) {
      setActivityPrefill(null);
    }
  }, []);

  const handleEmailSheetOpenChange = useCallback((open: boolean) => {
    setEmailSheetOpen(open);

    if (!open) {
      setEmailActivityPrefill(null);
    }
  }, []);

  const handleArchiveSubmit = useCallback(
    (data: ArchiveApplicationFormData) => {
      if (!application) {
        return;
      }

      if (data.notice === null) {
        runTerminalAction({
          action: 'archive',
          applicationId: application.id,
          archiveReasonId: data.archiveReasonId,
          jobId,
          notice: null,
          orgId,
        });

        return;
      }

      if (!applicantEmail || !vaultPublicKey || !vaultKeyVersion) {
        toast.error('Decrypt the candidate email before updating the application');

        return;
      }

      runTerminalAction({
        action: 'archive',
        applicationId: application.id,
        archiveReasonId: data.archiveReasonId,
        applicantEmail,
        jobId,
        notice: data.notice,
        orgId,
        vaultPublicKey,
        vaultKeyVersion,
      });
    },
    [application, applicantEmail, jobId, orgId, runTerminalAction, vaultKeyVersion, vaultPublicKey],
  );

  const handleReopenToStage = useCallback(
    (targetStageId: string) => {
      if (!application) {
        return;
      }

      runTerminalAction({
        action: 'reopen',
        applicationId: application.id,
        jobId,
        orgId,
        targetStageId,
      });
    },
    [application, jobId, orgId, runTerminalAction],
  );

  const handleEmailSubmit = useCallback(
    (data: ComposeEmailData) => {
      sendEmail({
        ...data,
        activityId: emailActivityPrefill?.activityId,
        onSuccess: () => {
          setEmailSheetOpen(false);
          setEmailActivityPrefill(null);
        },
      });
    },
    [sendEmail, emailActivityPrefill],
  );

  return {
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
    isChangingStage: stageActions.isChangingStage,
    handleStageChange: stageActions.handleStageChange,
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
  };
}
