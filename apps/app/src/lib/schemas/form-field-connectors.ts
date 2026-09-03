import { dataArraySchema, paginationSchema, uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import { fieldTypeSchema, objectTypeSchema } from './custom-fields';

const optionMappingSchema = z.record(z.string().min(1), z.string().min(1));

export const createConnectorBodySchema = z.object({
  formQuestionId: uuidSchema,
  fieldId: uuidSchema,
  optionMapping: optionMappingSchema.optional(),
  unmappedFallback: z.string().trim().min(1).max(200).optional(),
});

export type CreateConnectorBody = z.infer<typeof createConnectorBodySchema>;

export const connectorRowSchema = z.object({
  id: uuidSchema,
  formQuestionId: uuidSchema,
  questionType: fieldTypeSchema,
  questionPrompt: z.string(),
  fieldId: uuidSchema,
  fieldTitle: z.string(),
  fieldType: fieldTypeSchema,
  fieldObjectType: objectTypeSchema,
  fieldIsPrivate: z.boolean(),
  optionMapping: optionMappingSchema.nullable(),
  unmappedFallback: z.string().nullable(),
  createdAt: z.string(),
});

export type ConnectorRow = z.infer<typeof connectorRowSchema>;

export const createConnectorResponseSchema = z.object({
  id: uuidSchema,
  formQuestionId: uuidSchema,
  fieldId: uuidSchema,
  optionMapping: optionMappingSchema.nullable(),
  unmappedFallback: z.string().nullable(),
  createdAt: z.string(),
  pendingProjectionCount: z.number().int().min(0),
});

export type CreateConnectorResponse = z.infer<typeof createConnectorResponseSchema>;

export const listConnectorsResponseSchema = dataArraySchema(connectorRowSchema);

export type ListConnectorsResponse = z.infer<typeof listConnectorsResponseSchema>;

export const pendingProjectionRowSchema = z.object({
  submissionId: uuidSchema,
  applicationId: uuidSchema.nullable(),
  candidateId: uuidSchema,
  formClass: z.enum(['application', 'feedback']),
  submittedAt: z.string(),
});

export type PendingProjectionRow = z.infer<typeof pendingProjectionRowSchema>;

export const pendingProjectionsResponseSchema = z.object({
  data: z.array(pendingProjectionRowSchema),
  pagination: paginationSchema,
});

export type PendingProjectionsResponse = z.infer<typeof pendingProjectionsResponseSchema>;
