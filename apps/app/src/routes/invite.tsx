import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { InviteAcceptPage } from '@/components/features/invite-accept';

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/invite')({
  ssr: false,
  validateSearch: searchSchema,
  headers: () => ({ 'Referrer-Policy': 'no-referrer' }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useSearch();

  return <InviteAcceptPage token={token ?? null} />;
}
