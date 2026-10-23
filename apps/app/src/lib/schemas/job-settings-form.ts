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

/**
 * Schema for editable Job settings shared by drafts, open Jobs, and templates.
 */
export const JobSettingsFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
    departmentId: uuidSchema.optional(),
    locationId: uuidSchema.optional(),
    location: z.array(locationEntrySchema).optional(),
    locationType: z.enum(LOCATION_TYPE_VALUES).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
    category: z.enum(CATEGORY_VALUES).optional(),
    compensationDisplayMode: z.enum(['inherit', 'hidden', 'custom']).optional(),
    compensationCurrency: z.enum(CURRENCY_VALUES).optional(),
    compensationPeriod: z.enum(SALARY_PERIOD_VALUES).optional(),
    compensationMin: z.number().int().optional(),
    compensationMax: z.number().int().optional(),
    applicationCapacity: z.number().int().min(1).max(1000).nullable().optional(),
  })
  .superRefine((values, context) => {
    if (values.compensationDisplayMode === 'hidden') {
      return;
    }

    for (const name of ['compensationMin', 'compensationMax'] as const) {
      if (values[name] !== undefined && values[name] < 1) {
        context.addIssue({ code: 'custom', path: [name], message: 'Must be at least 1' });
      }
    }
  });

export type JobSettingsFormData = z.infer<typeof JobSettingsFormSchema>;

/**
 * Schema for the create draft dialog.
 */
export const CreateDraftDialogSchema = z.object({
  title: JobSettingsFormSchema.shape.title,
});

export type CreateDraftDialogData = z.infer<typeof CreateDraftDialogSchema>;
