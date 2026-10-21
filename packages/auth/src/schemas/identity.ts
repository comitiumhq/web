import { z } from 'zod';

export const identityUserSchema = z.object({ id: z.string(), email: z.string(), emailVerified: z.boolean() });

export const identitySessionSchema = z.object({
  user: identityUserSchema,
  session: z.object({ expiresAt: z.coerce.date(), interactiveAuthenticatedAt: z.coerce.date().nullish() }),
});

export const linkedAuthAccountsSchema = z.array(z.object({ id: z.string(), providerId: z.string() }));
export const linkedPasskeysSchema = z.array(z.object({ id: z.string(), name: z.string().nullish() }));

export const sessionEventSchema = z
  .object({
    type: z.enum(['logout-start', 'logout-complete', 'keys-changed']),
    userId: z.uuid(),
    sourceId: z.uuid(),
  })
  .strict();

export type SessionEvent = z.infer<typeof sessionEventSchema>;
export type LinkedAuthAccount = z.infer<typeof linkedAuthAccountsSchema>[number];
export type LinkedPasskey = z.infer<typeof linkedPasskeysSchema>[number];
export type IdentityUser = z.infer<typeof identityUserSchema>;
