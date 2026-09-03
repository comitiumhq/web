import { z } from 'zod';

import { dataArraySchema, selectableValueSchema, uuidSchema } from './contract-primitives';
import { FIELD_TYPE_IDS, FORM_CLASSES } from './field-types/types';

const formClassSchema = z.enum(FORM_CLASSES);

export const FIELD_PROJECTION_VALUE_KINDS = ['boolean', 'option', 'number', 'timestamp'] as const;

const formReusableFieldDescriptorSchema = z
  .object({
    fieldId: uuidSchema,
    valueKind: z.enum(FIELD_PROJECTION_VALUE_KINDS),
    optionValueMap: z.record(z.string(), z.number()).optional(),
  })
  .strict();

export const ORG_DEFAULT_FORM_VALUE = '__default__';

export const formDefinitionRowSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  formClass: formClassSchema,
  title: z.string(),
  interviewId: uuidSchema.nullable(),
  isDefaultForm: z.boolean(),
  isArchived: z.boolean(),
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FormDefinitionRow = z.infer<typeof formDefinitionRowSchema>;

export const formDefinitionListItemSchema = formDefinitionRowSchema.extend({
  jobActivityCount: z.number().int().nonnegative(),
  jobTemplateActivityCount: z.number().int().nonnegative(),
  interviewTemplateCount: z.number().int().nonnegative(),
  jobCount: z.number().int().nonnegative(),
  jobTemplateCount: z.number().int().nonnegative(),
});

export type FormDefinitionListItem = z.infer<typeof formDefinitionListItemSchema>;

export const formSectionRowSchema = z.object({
  id: uuidSchema,
  formId: uuidSchema,
  position: z.number().int(),
  title: z.string(),
});

const formQuestionConfigSchema = z
  .object({
    supportedFileTypes: z.array(z.string()).optional(),
    maxFileSizeBytes: z.number().int().positive().optional(),
    candidateProfileField: z.enum(['first_name', 'last_name']).optional(),
  })
  .strict();

const formQuestionBaseSchema = z.object({
  id: uuidSchema,
  position: z.number().int(),
  questionType: z.enum(FIELD_TYPE_IDS),
  prompt: z.string(),
  description: z.string().nullable(),
  isRequired: z.boolean(),
  isPrivate: z.boolean(),
  isLocked: z.boolean().optional(),
  selectableValues: z.array(selectableValueSchema).nullable(),
  config: formQuestionConfigSchema.nullable(),
});

export const formQuestionRowSchema = formQuestionBaseSchema.extend({
  sectionId: uuidSchema,
  reusableFieldId: uuidSchema.nullable(),
});

export type FormQuestionRow = z.infer<typeof formQuestionRowSchema>;

export const formSnapshotQuestionSchema = formQuestionBaseSchema.extend({
  visibility: z.enum(['standard', 'private']),
  reusableField: formReusableFieldDescriptorSchema.nullable(),
});

export type FormSnapshotQuestion = z.infer<typeof formSnapshotQuestionSchema>;

const renderableFormQuestionSchema = formSnapshotQuestionSchema
  .pick({
    id: true,
    position: true,
    questionType: true,
    prompt: true,
    description: true,
    isRequired: true,
    selectableValues: true,
    config: true,
  })
  .strict();

export type RenderableFormQuestion = z.infer<typeof renderableFormQuestionSchema>;

const renderableFormSectionSchema = formSectionRowSchema
  .pick({ id: true, position: true, title: true })
  .extend({ questions: z.array(renderableFormQuestionSchema) })
  .strict();

export type RenderableForm = {
  sections: z.infer<typeof renderableFormSectionSchema>[];
};

export const formOptionSchema = z
  .object({
    id: uuidSchema,
    title: z.string(),
    isDefaultForm: z.boolean(),
  })
  .strict();

export const formOptionsResponseSchema = dataArraySchema(formOptionSchema);

const applicationFormOptionSchema = formOptionSchema
  .extend({ sections: z.array(renderableFormSectionSchema) })
  .strict();

export type ApplicationFormOption = z.infer<typeof applicationFormOptionSchema>;

export const applicationFormOptionsResponseSchema = dataArraySchema(applicationFormOptionSchema);

export const nestedFormSchema = z.object({
  form: z.object({
    id: uuidSchema,
    formClass: formClassSchema,
    title: z.string(),
  }),
  sections: z.array(
    formSectionRowSchema
      .pick({ id: true, position: true, title: true })
      .extend({ questions: z.array(formSnapshotQuestionSchema) }),
  ),
});

export type NestedForm = z.infer<typeof nestedFormSchema>;

export const adminFormDetailSchema = z.object({
  form: formDefinitionRowSchema,
  sections: z.array(formSectionRowSchema.extend({ questions: z.array(formQuestionRowSchema) })),
});

export type AdminFormDetail = z.infer<typeof adminFormDetailSchema>;

export const listFormsResponseSchema = dataArraySchema(formDefinitionListItemSchema);

const feedbackFormJobActivityUsageSchema = z.object({
  activityId: uuidSchema,
  jobId: uuidSchema,
  jobTitle: z.string().nullable(),
  jobStatus: z.enum(['draft', 'open', 'closed']),
  stageName: z.string(),
});

const feedbackFormJobTemplateActivityUsageSchema = z.object({
  activityId: uuidSchema,
  jobTemplateId: uuidSchema,
  jobTemplateTitle: z.string(),
  jobTemplateStatus: z.enum(['active', 'inactive', 'archived']),
  stageName: z.string(),
});

const feedbackFormInterviewTemplateUsageSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  isArchived: z.boolean(),
});

const feedbackFormUsageDataSchema = z.object({
  formClass: z.literal('feedback'),
  jobActivities: z.array(feedbackFormJobActivityUsageSchema),
  jobTemplateActivities: z.array(feedbackFormJobTemplateActivityUsageSchema),
  interviewTemplates: z.array(feedbackFormInterviewTemplateUsageSchema),
});

const applicationFormUsageDataSchema = z.object({
  formClass: z.literal('application'),
  jobs: z.array(
    z.object({
      id: uuidSchema,
      title: z.string().nullable(),
      status: z.enum(['draft', 'open', 'closed']),
    }),
  ),
  jobTemplates: z.array(
    z.object({
      id: uuidSchema,
      title: z.string(),
      status: z.enum(['active', 'inactive', 'archived']),
    }),
  ),
});

export const feedbackFormUsageSchema = z.object({ data: feedbackFormUsageDataSchema });
export const applicationFormUsageSchema = z.object({ data: applicationFormUsageDataSchema });

export type FeedbackFormUsage = z.infer<typeof feedbackFormUsageSchema>['data'];
export type ApplicationFormUsage = z.infer<typeof applicationFormUsageSchema>['data'];

// --- Request bodies ---

const createSectionInputSchema = z.object({
  title: z.string().trim().max(200),
  questions: z
    .array(
      z.object({
        questionType: z.enum(FIELD_TYPE_IDS),
        prompt: z.string().trim().min(1).max(1000),
        description: z.string().trim().max(2000).optional(),
        isRequired: z.boolean().optional(),
        isPrivate: z.boolean().optional(),
        selectableValues: z.array(selectableValueSchema).min(1).max(200).optional(),
        config: formQuestionConfigSchema.optional(),
      }),
    )
    .default([]),
});

const createFormBodySchema = z.object({
  formClass: formClassSchema,
  title: z.string().trim().min(1).max(200),
  sections: z.array(createSectionInputSchema).default([]),
});

export type CreateFormBody = z.infer<typeof createFormBodySchema>;

const updateQuestionInputSchema = z.object({
  id: uuidSchema.optional(),
  questionType: z.enum(FIELD_TYPE_IDS),
  prompt: z.string().trim().min(1).max(1000),
  description: z.string().trim().max(2000).optional(),
  isRequired: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  reusableFieldId: uuidSchema.nullable().optional(),
  selectableValues: z.array(selectableValueSchema).min(1).max(200).optional(),
  config: formQuestionConfigSchema.optional(),
});

const updateSectionInputSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().max(200),
  questions: z.array(updateQuestionInputSchema).default([]),
});

const updateFormBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  sections: z.array(updateSectionInputSchema).default([]),
});

export type UpdateFormBody = z.infer<typeof updateFormBodySchema>;
