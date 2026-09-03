import { formatRelativeTime } from '@comitium/ui/date';
import type { OrgInvite } from '@/lib/schemas/org';

type InviteDeliveryVariant = 'secondary' | 'success' | 'warning' | 'destructive';

interface InviteDeliverySummary {
  label: string;
  detail: string;
  variant: InviteDeliveryVariant;
}

export function getInviteDeliverySummary(invite: OrgInvite): InviteDeliverySummary {
  const status = invite.emailDeliveryStatus ?? 'queued';

  if (status === 'delivered') {
    return {
      label: 'Delivered',
      detail: formatInviteDeliveryTime(invite.emailDeliveryStatusUpdatedAt ?? invite.emailDeliverySentAt),
      variant: 'success',
    };
  }

  if (status === 'sent') {
    return {
      label: 'Sent',
      detail: formatInviteDeliveryTime(invite.emailDeliverySentAt ?? invite.emailDeliveryStatusUpdatedAt),
      variant: 'success',
    };
  }

  if (status === 'queued') {
    return {
      label: 'Queued',
      detail: 'Waiting to send',
      variant: 'secondary',
    };
  }

  if (status === 'failed' || status === 'bounced' || status === 'suppressed') {
    return {
      label: 'Email issue',
      detail: invite.emailDeliveryError ?? humanizeDeliveryStatus(status),
      variant: 'destructive',
    };
  }

  return {
    label: 'Pending',
    detail: humanizeDeliveryStatus(status),
    variant: 'warning',
  };
}

function formatInviteDeliveryTime(date?: string | null): string {
  if (!date) {
    return 'Email sent';
  }

  return `Sent ${formatRelativeTime(date)}`;
}

function humanizeDeliveryStatus(status: string): string {
  return status.replaceAll('_', ' ');
}
