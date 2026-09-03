import { formatDate } from '@comitium/ui/date';
import type { ActivityFeedRow } from '@/lib/schemas/emails';

const DATE_FORMAT = 'MMM d, h:mm a';

interface InterviewMetadata {
  previousScheduledAt?: string | null;
  reason?: string | null;
  scheduledAt?: string | null;
  recipientEmail?: string | null;
  reasonText?: string | null;
}

export function getEventSubline(event: ActivityFeedRow, selectedApplicationId: string | null): string | null {
  const meta = event.metadata as InterviewMetadata;
  const detail = getEventDetail(event, meta);
  const isDifferentApplication = event.applicationId !== selectedApplicationId;
  const jobTitle = event.scope === 'application' && isDifferentApplication ? event.jobTitle : null;

  if (detail && jobTitle) {
    return `${detail} · ${jobTitle}`;
  }

  return detail ?? jobTitle;
}

function getEventDetail(event: ActivityFeedRow, meta: InterviewMetadata): string | null {
  switch (event.type) {
    case 'interview_rescheduled':
      return formatRescheduled(meta);
    case 'interview_cancelled':
      return formatCancelled(meta);
    case 'email_bounced':
      return formatEmailBounced(meta);
    default:
      return null;
  }
}

function formatRescheduled(meta: InterviewMetadata | null): string | null {
  if (!meta?.previousScheduledAt || !meta?.scheduledAt) {
    return meta?.reasonText ?? null;
  }

  const from = formatDate(meta.previousScheduledAt, DATE_FORMAT);
  const to = formatDate(meta.scheduledAt, DATE_FORMAT);

  return appendReason(`from ${from} to ${to}`, meta.reasonText);
}

function formatCancelled(meta: InterviewMetadata | null): string | null {
  if (!meta?.scheduledAt) {
    return meta?.reasonText ?? null;
  }

  return appendReason(`was ${formatDate(meta.scheduledAt, DATE_FORMAT)}`, meta.reasonText);
}

function appendReason(base: string, reason?: string | null): string {
  return reason ? `${base} · ${reason}` : base;
}

function formatEmailBounced(meta: InterviewMetadata | null): string | null {
  if (!meta?.recipientEmail) {
    return meta?.reason ?? null;
  }

  return appendReason(`to ${meta.recipientEmail}`, meta.reason);
}
