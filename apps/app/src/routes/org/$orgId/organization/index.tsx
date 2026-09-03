import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$orgId/organization/')({
  ssr: false,
  component: OrganizationIndex,
});

function OrganizationIndex() {
  const { orgId } = Route.useParams();

  return <Navigate to="/org/$orgId/organization/company" params={{ orgId }} replace />;
}
