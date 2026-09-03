import { createFileRoute } from '@tanstack/react-router';

import { PublicSchedulePage } from '@/components/features/interviews/public-schedule';

export const Route = createFileRoute('/schedule/$token')({
  ssr: false,
  headers: () => ({ 'Referrer-Policy': 'no-referrer' }),
  head: () => ({
    meta: [{ title: 'Schedule Interview | Comitium' }],
  }),
  component: PublicScheduleRoute,
});

function PublicScheduleRoute() {
  const { token } = Route.useParams();

  return <PublicSchedulePage token={token} />;
}
