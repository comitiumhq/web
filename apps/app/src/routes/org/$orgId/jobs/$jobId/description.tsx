import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/description')({
  ssr: false,
  component: LegacyDescriptionRoute,
});

function LegacyDescriptionRoute() {
  const { orgId, jobId } = Route.useParams();

  return <Navigate to="/org/$orgId/jobs/$jobId/posting" params={{ orgId, jobId }} replace />;
}
