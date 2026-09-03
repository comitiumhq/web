import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

const jobUsageSchema = z.object({
  id: uuidSchema,
  title: z.string().nullable(),
  status: z.enum(['draft', 'open', 'closed']),
  stageNames: z.array(z.string()),
});

const jobTemplateUsageSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  status: z.enum(['active', 'inactive', 'archived']),
  stageNames: z.array(z.string()),
});

export const stageActivityTemplateUsageSchema = z.object({
  data: z.object({
    jobs: z.array(jobUsageSchema),
    jobTemplates: z.array(jobTemplateUsageSchema),
  }),
});

export type StageActivityTemplateUsage = z.infer<typeof stageActivityTemplateUsageSchema>['data'];
