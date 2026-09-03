import type { Badge } from '@comitium/ui/badge';
import type { ComponentProps } from 'react';
import { InterviewStatus, type InterviewStatusValue } from '@/lib/schemas/interviews';

type InterviewStatusDisplay = {
  label: string;
  variant: NonNullable<ComponentProps<typeof Badge>['variant']>;
};

export const INTERVIEW_STATUS_DISPLAY: Record<InterviewStatusValue, InterviewStatusDisplay> = {
  [InterviewStatus.NEEDS_SCHEDULING]: { label: 'Needs scheduling', variant: 'warning' },
  [InterviewStatus.LINK_SENT]: { label: 'Booking link sent', variant: 'info' },
  [InterviewStatus.SCHEDULED]: { label: 'Scheduled', variant: 'success' },
  [InterviewStatus.IN_PROGRESS]: { label: 'In progress', variant: 'warning' },
  [InterviewStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [InterviewStatus.CANCELLED]: { label: 'Cancelled', variant: 'secondary' },
  [InterviewStatus.NO_SHOW]: { label: 'No-show', variant: 'destructive' },
};
