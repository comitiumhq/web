import type { FeedbackSubmissionSource } from './use-feedback-submission-flow';

export function getSourceContextLabel(source: FeedbackSubmissionSource | null): string | null {
  if (!source) {
    return null;
  }

  if (source.kind === 'event') {
    return source.interviewTitle;
  }

  return source.stageName;
}

export function getSheetTitle(mode: 'create' | 'edit' | null, source: FeedbackSubmissionSource | null): string {
  if (mode === 'edit') {
    return 'Edit Feedback';
  }

  if (source?.kind === 'event') {
    return source.interviewTitle;
  }

  return 'Application Review';
}

export function formatSheetDescription(candidateName: string | null, contextLabel: string | null): string {
  if (!candidateName) {
    return 'Share your assessment of this candidate.';
  }

  if (!contextLabel) {
    return candidateName;
  }

  return `${candidateName} · ${contextLabel}`;
}

export function getFormTitle(source: FeedbackSubmissionSource | null, snapshotTitle?: string): string {
  if (source?.kind === 'activity' && source.activity.feedbackFormTitle) {
    return source.activity.feedbackFormTitle;
  }

  return snapshotTitle ?? 'Org default form';
}
