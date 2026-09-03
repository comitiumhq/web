import type { ActivityFeedRow } from '@/lib/schemas/emails';

export function getActivityEmailSenderRole(eventType: ActivityFeedRow['type']): 'applicant' | 'org_member' {
  if (eventType === 'email_received') {
    return 'applicant';
  }

  return 'org_member';
}
