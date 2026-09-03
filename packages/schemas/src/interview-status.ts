import { z } from 'zod';

export const InterviewStatus = {
  NEEDS_SCHEDULING: 'needs_scheduling',
  LINK_SENT: 'link_sent',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type InterviewStatusValue = (typeof InterviewStatus)[keyof typeof InterviewStatus];

const interviewStatusValues = Object.values(InterviewStatus) as [InterviewStatusValue, ...InterviewStatusValue[]];
export const interviewStatusEnum = z.enum(interviewStatusValues);
