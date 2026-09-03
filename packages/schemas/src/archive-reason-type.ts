import { z } from 'zod';

export const archiveReasonTypeSchema = z.enum(['rejected_by_org', 'rejected_by_candidate', 'other']);
export type ArchiveReasonType = z.infer<typeof archiveReasonTypeSchema>;
