import type { ReasonAppliesTo, ReasonCategory } from '@/lib/schemas/cancel-reschedule-reasons';

export const REASON_CATEGORY_LABELS: Record<ReasonCategory, string> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
  company: 'Company',
};

export const REASON_APPLIES_TO_LABELS: Record<ReasonAppliesTo, string> = {
  cancel: 'Cancel only',
  reschedule: 'Reschedule only',
  both: 'Both',
};
