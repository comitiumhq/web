import type { CandidateSheetActionState } from '@comitium/schemas/applications';

type ActivityActionKind = 'review_application' | 'schedule_interview' | 'send_email' | 'submit_feedback';
type BlockedReason = NonNullable<CandidateSheetActionState['blockedReason']>;

const EMPTY_ACTIVITY_MESSAGES: Record<BlockedReason, string> = {
  commitment_settling: 'The public commitment is settling.',
  terminal_consideration: 'Application is closed.',
  identity_processing: 'Candidate profile is still processing.',
};

export function isPrimaryActivityAction(
  actionState: CandidateSheetActionState,
  kind: ActivityActionKind,
  activityId: string,
): boolean {
  const { nextAction } = actionState;

  if (!nextAction || nextAction.kind !== kind) {
    return false;
  }

  return nextAction.activityId === activityId;
}

export function isPrimaryInterviewFeedbackAction(
  actionState: CandidateSheetActionState,
  interviewEventId: string,
): boolean {
  const { nextAction } = actionState;

  if (!nextAction || nextAction.kind !== 'submit_feedback') {
    return false;
  }

  return nextAction.interviewId === interviewEventId;
}

export function getCandidateSheetEmptyActivityMessage(actionState: CandidateSheetActionState): string {
  if (!actionState.blockedReason) {
    return 'Nothing is waiting for action right now.';
  }

  return EMPTY_ACTIVITY_MESSAGES[actionState.blockedReason];
}
