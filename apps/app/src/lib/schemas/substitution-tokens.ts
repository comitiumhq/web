import { dataArraySchema } from '@comitium/schemas/public';
import { z } from 'zod';

const TOKEN_REGISTRIES = ['email'] as const;

export type TokenRegistry = (typeof TOKEN_REGISTRIES)[number];

const substitutionTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  label: z.string(),
  description: z.string(),
});

export const substitutionTokensResponseSchema = dataArraySchema(substitutionTokenSchema);
