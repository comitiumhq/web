import {
  CATEGORY_VALUES,
  EMPLOYMENT_TYPE_VALUES,
  LOCATION_TYPE_VALUES,
  PUBLIC_JOB_SORT_VALUES,
} from '@comitium/schemas/job-enums';
import { z } from 'zod';

export const jobsSearchSchema = z.object({
  orgSlug: z.string().min(1).optional(),
  postingSlug: z.string().min(1).optional(),
  search: z.string().optional(),
  location: z.string().optional(),
  locationType: z.enum(LOCATION_TYPE_VALUES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  sort: z.enum(PUBLIC_JOB_SORT_VALUES).optional(),
});

export type JobsSearch = z.infer<typeof jobsSearchSchema>;
