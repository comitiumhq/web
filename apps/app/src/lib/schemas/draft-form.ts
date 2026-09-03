import {
  CATEGORY_VALUES,
  CURRENCY_VALUES,
  EMPLOYMENT_TYPE_VALUES,
  LOCATION_TYPE_VALUES,
  SALARY_PERIOD_VALUES,
} from '@comitium/schemas/job-enums';
import { uuidSchema } from '@comitium/schemas/public';
import { locationEntrySchema } from '@comitium/schemas/public-jobs';
import { z } from 'zod';
import { isDefined } from '@/lib/utils';

/**
 * Schema for draft editing form.
 */
export const DraftFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  departmentId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  location: z.array(locationEntrySchema).optional(),
  locationType: z.enum(LOCATION_TYPE_VALUES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  compensationCurrency: z.enum(CURRENCY_VALUES).optional(),
  compensationPeriod: z.enum(SALARY_PERIOD_VALUES).optional(),
  compensationMin: z.number().int().min(1, 'Must be at least 1').optional(),
  compensationMax: z.number().int().min(1, 'Must be at least 1').optional(),
});

export type DraftFormData = z.infer<typeof DraftFormSchema>;

/**
 * Schema for the create draft dialog.
 */
export const CreateDraftDialogSchema = DraftFormSchema.pick({
  title: true,
});

export type CreateDraftDialogData = z.infer<typeof CreateDraftDialogSchema>;

/**
 * Schema for the publish dialog.
 */
export const PublishDialogSchema = z.object({
  employerStake: z
    .number({
      error: (issue) => (isDefined(issue.input) ? 'Must be a number' : 'Refundable stake is required'),
    })
    .int('Must be a whole number')
    .min(1, 'Minimum deposit is $1'),
  feeTier: z.number().int().min(0).max(9),
  maxApplications: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(1000, 'Maximum 1000 applications')
    .optional(),
});

export type PublishDialogData = z.infer<typeof PublishDialogSchema>;
