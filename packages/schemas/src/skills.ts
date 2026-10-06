import { z } from 'zod';
import { uuidSchema } from './public';

export const MAX_POSTING_SKILLS = 10;

export const skillSelectionSchema = z.object({
  skillId: uuidSchema,
  required: z.boolean(),
});

export type SkillSelection = z.infer<typeof skillSelectionSchema>;

export const skillDisplaySchema = skillSelectionSchema.extend({
  label: z.string(),
});

export type SkillDisplay = z.infer<typeof skillDisplaySchema>;

export const skillRequirementSchema = skillDisplaySchema.extend({
  status: z.enum(['active', 'retired']),
});

export type SkillRequirement = z.infer<typeof skillRequirementSchema>;

export const skillSearchResponseSchema = z.object({
  data: z.array(
    z.object({
      id: uuidSchema,
      label: z.string(),
      categories: z.array(z.object({ code: z.string(), label: z.string() })),
    }),
  ),
  nextPage: z.number().int().nonnegative().nullable(),
});

export type SkillSearchResponse = z.infer<typeof skillSearchResponseSchema>;

export const skillLookupResponseSchema = skillSearchResponseSchema.pick({ data: true });
