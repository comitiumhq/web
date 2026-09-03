import { BROWSER_TZ } from '@comitium/ui/date';
import { z } from 'zod';

export const formSchema = z.object({
  interviewId: z.guid('Select an interview type'),
  durationMinutes: z.number().int().min(15).max(180),
  scheduledAt: z.string().min(1, 'Pick a time slot'),
  stageId: z.guid(),
  timeZone: z.string().min(1),
});

export type FormData = z.infer<typeof formSchema>;

export const DEFAULT_VALUES: FormData = {
  interviewId: '',
  durationMinutes: 60,
  scheduledAt: '',
  stageId: '',
  timeZone: BROWSER_TZ,
};
