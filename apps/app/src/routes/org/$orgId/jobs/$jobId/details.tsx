import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/details')({
  ssr: false,
  component: LegacyDetailsRoute,
});

function LegacyDetailsRoute() {
  const { orgId, jobId } = Route.useParams();

  return <Navigate to="/org/$orgId/jobs/$jobId/settings" params={{ orgId, jobId }} replace />;
}
