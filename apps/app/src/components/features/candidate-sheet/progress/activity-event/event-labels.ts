import type { ActivityEventType, ActivityFeedRow } from '@/lib/schemas/emails';

const EVENT_LABELS: Partial<Record<ActivityEventType, string>> = {
  stage_changed: 'Stage changed',
  archived: 'Archived',
  unarchived: 'Unarchived',
  transferred: 'Transferred',
  interview_scheduled: 'Interview scheduled',
  interview_rescheduled: 'Interview rescheduled',
  interview_cancelled: 'Interview cancelled',
  interview_started: 'Interview started',
  interview_completed: 'Interview completed',
  interview_no_show: 'No-show',
  scheduling_link_sent: 'Scheduling link sent',
  email_sent_from_activity: 'Email sent',
  email_sent: 'Email sent',
  email_received: 'Email received',
  email_bounced: 'Email bounced',
  feedback_submitted: 'Feedback submitted',
  feedback_requested: 'Feedback requested',
  feedback_edited: 'Feedback edited',
  feedback_deleted: 'Feedback deleted',
  application_created: 'Application created',
  application_responded: 'Application responded',
  application_outcome_recorded: 'Application closed',
  application_outcome_reopened: 'Application reopened',
  note_added: 'Note added',
  note_deleted: 'Note deleted',
  candidate_file_added: 'Candidate file added',
  candidate_file_updated: 'Candidate file updated',
  candidate_file_removed: 'Candidate file removed',
};

export function getEventLabel(event: ActivityFeedRow): string {
  if (event.type === 'interview_no_show' && event.metadata.cleared === true) {
    return 'No-show cleared';
  }

  if (event.type === 'stage_changed' && event.payload.kind === 'stage' && event.payload.toStageName) {
    return `Moved to ${event.payload.toStageName}`;
  }

  const base = EVENT_LABELS[event.type] ?? event.type;
  const title = typeof event.metadata.title === 'string' ? event.metadata.title : null;

  if (title) {
    return `${base}: ${title}`;
  }

  return base;
}
