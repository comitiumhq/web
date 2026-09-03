import { z } from 'zod';

export const stageTypeSchema = z.enum(['lead', 'review', 'active', 'offer', 'hired']);
export type StageType = z.infer<typeof stageTypeSchema>;
