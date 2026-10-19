import { z } from 'zod';

export const linkedAuthAccountsSchema = z.array(z.object({ id: z.string(), providerId: z.string() }));
export const linkedPasskeysSchema = z.array(z.object({ id: z.string(), name: z.string().nullish() }));

export type LinkedAuthAccount = z.infer<typeof linkedAuthAccountsSchema>[number];
export type LinkedPasskey = z.infer<typeof linkedPasskeysSchema>[number];
