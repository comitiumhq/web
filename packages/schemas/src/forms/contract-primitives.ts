import { z } from 'zod';

export const uuidSchema = z.guid();

export function dataArraySchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ data: z.array(itemSchema) });
}

export const selectableValueSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  isArchived: z.boolean().optional(),
});
