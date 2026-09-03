import { z } from 'zod';

import { dataArraySchema } from './public';

const citySchema = z.object({
  id: z.number(),
  name: z.string(),
  admin1: z.string().nullable(),
  countryCode: z.string(),
  country: z.string(),
  population: z.number(),
});

export type City = z.infer<typeof citySchema>;

export const citiesResponseSchema = dataArraySchema(citySchema);
