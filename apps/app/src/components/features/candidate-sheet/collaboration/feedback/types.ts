import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';
import type { ApplicationReviewActivity } from '@/lib/schemas/stage-activities';

export type DecryptedEntry =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; values: Record<string, unknown> };

export type SourceGroupItem =
  | { kind: 'submitted'; submission: FeedbackSubmission }
  | { kind: 'pending-reviewer'; userId: string; canSubmit: boolean }
  | { kind: 'add-mine' };

export interface FeedbackAccessState {
  canModerateFeedback: boolean;
  canSubmitFeedback: boolean;
  isOnHiringTeam: boolean;
}

interface SourceGroupBase {
  id: string;
  title: string;
  subtitle?: string;
  items: SourceGroupItem[];
}

export type SourceGroup =
  | (SourceGroupBase & { kind: 'ar'; activity: ApplicationReviewActivity })
  | (SourceGroupBase & { kind: 'event'; eventId: string; interviewTitle: string })
  | (SourceGroupBase & { kind: 'orphan' });
