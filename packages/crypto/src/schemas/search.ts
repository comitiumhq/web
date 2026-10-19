import { z } from 'zod';

export const locationHashValueSchema = z.object({ cityId: z.number() });
