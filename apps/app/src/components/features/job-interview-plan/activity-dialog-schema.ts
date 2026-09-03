import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

export const scheduleInterviewSchema = z.object({
  interviewId: z.string().min(1, 'Interview template is required'),
  defaultInterviewerUserIds: z.array(uuidSchema).max(10),
});

export const sendEmailSchema = z.object({
  emailTemplateId: z.string().min(1, 'Email template is required'),
});

export const applicationReviewSchema = z.object({
  reviewerUserIds: z.array(uuidSchema).max(20),
  feedbackFormId: z.string(),
});

export type ScheduleInterviewFormData = z.infer<typeof scheduleInterviewSchema>;
export type SendEmailFormData = z.infer<typeof sendEmailSchema>;
export type ApplicationReviewFormData = z.infer<typeof applicationReviewSchema>;
