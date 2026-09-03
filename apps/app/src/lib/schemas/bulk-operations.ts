import { encryptedEnvelopeSchema, envelopeKeySchema, publicEncryptionKeySchema } from '@comitium/crypto/schemas';
import { z } from 'zod';

const bulkOperationTypeSchema = z.enum([
  'application.assign_candidate_tag',
  'application.email',
  'application.archive',
]);
const bulkOperationTargetTypeSchema = z.enum(['application']);
const bulkOperationStatusSchema = z.enum(['draft', 'queued', 'running', 'completed', 'completed_with_errors']);
const bulkOperationItemStatusSchema = z.enum([
  'ready',
  'excluded',
  'pending',
  'processing',
  'waiting',
  'succeeded',
  'skipped',
  'failed',
]);

const statusCountsSchema = z.record(bulkOperationItemStatusSchema, z.number().int().nonnegative());
const applicationItemSchema = z.object({
  applicationId: z.string().nullable(),
  candidateId: z.string().nullable(),
  jobId: z.string().nullable(),
  jobTitle: z.string().nullable(),
  requiresEmail: z.boolean(),
  childOperationId: z.string().nullable(),
  recipientPublicKey: publicEncryptionKeySchema.nullable(),
  deliveryGrant: z
    .object({
      id: z.string(),
      recipient: z.string(),
      processorPublicKey: publicEncryptionKeySchema,
      expiresAt: z.string(),
    })
    .nullable(),
});

const bulkOperationItemSchema = z.object({
  id: z.string(),
  ordinal: z.number().int().positive(),
  selectedTargetId: z.string(),
  status: bulkOperationItemStatusSchema,
  exclusion: z.object({ code: z.string(), message: z.string().nullable() }).nullable(),
  error: z.object({ code: z.string(), message: z.string().nullable() }).nullable(),
  application: applicationItemSchema.nullable(),
  completedAt: z.string().nullable(),
});

export const bulkOperationSchema = z.object({
  id: z.string(),
  operationType: bulkOperationTypeSchema,
  operationVersion: z.number().int().positive(),
  targetType: bulkOperationTargetTypeSchema,
  status: bulkOperationStatusSchema,
  targetCount: z.number().int().positive(),
  parameters: z.record(z.string(), z.unknown()).nullable(),
  committedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  counts: statusCountsSchema,
  items: z.array(bulkOperationItemSchema),
});

export const bulkOperationCapabilitiesSchema = z.object({
  maxItems: z.number().int().positive(),
});

const createBulkOperationDraftInputSchema = z.object({
  operationType: bulkOperationTypeSchema,
  targetIds: z.array(z.string()).min(1),
  idempotencyKey: z.string().min(1),
});

const bulkOperationEmailPayloadSchema = z.object({
  itemId: z.string(),
  content: encryptedEnvelopeSchema,
  deliveryGrantKey: envelopeKeySchema,
  emailTemplateId: z.string().optional(),
});

const commitBulkOperationInputSchema = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  excludedItemIds: z.array(z.string()).optional(),
});

export type BulkOperation = z.infer<typeof bulkOperationSchema>;
export type BulkOperationType = z.infer<typeof bulkOperationTypeSchema>;
export type BulkOperationItem = z.infer<typeof bulkOperationItemSchema>;
export type CreateBulkOperationDraftInput = z.infer<typeof createBulkOperationDraftInputSchema>;
export type BulkOperationEmailPayload = z.infer<typeof bulkOperationEmailPayloadSchema>;
export type CommitBulkOperationInput = z.infer<typeof commitBulkOperationInputSchema>;

export function isBulkOperationInProgress(operation: BulkOperation | null | undefined) {
  return operation?.status === 'queued' || operation?.status === 'running';
}

export function isBulkOperationTerminal(operation: BulkOperation | null | undefined) {
  return operation?.status === 'completed' || operation?.status === 'completed_with_errors';
}
