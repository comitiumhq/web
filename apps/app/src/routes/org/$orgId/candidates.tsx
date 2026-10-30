import { createFileRoute } from '@tanstack/react-router';
import { OrgRouteShell } from '@/components/auth/org-route-shell';
import { CandidatesPage } from '@/components/features/candidates';

export const Route = createFileRoute('/org/$orgId/candidates')({ ssr: false, component: CandidatesRoute });
function CandidatesRoute() {
  const { orgId } = Route.useParams();

  return (
    <OrgRouteShell orgId={orgId} errorTitle="Failed to load candidates">
      {() => <CandidatesPage key={orgId} orgId={orgId} />}
    </OrgRouteShell>
  );
}
