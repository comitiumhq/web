import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/application-form')({
  ssr: false,
  component: LegacyApplicationFormRoute,
});

function LegacyApplicationFormRoute() {
  const { orgId, jobId } = Route.useParams();

  return <Navigate to="/org/$orgId/jobs/$jobId/posting" params={{ orgId, jobId }} replace />;
}
