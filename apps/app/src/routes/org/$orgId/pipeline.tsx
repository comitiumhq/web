import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';

import { OrgRouteShell } from '@/components/auth/org-route-shell';
import { GlobalPipelineDashboard } from '@/components/features/pipeline/global';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';

const pipelineSearchSchema = z.object({
  tab: z.enum(['review', 'active', 'offer', 'hired', 'archived']).catch('review').default('review'),
});

type PipelineSearch = z.infer<typeof pipelineSearchSchema>;

export const Route = createFileRoute('/org/$orgId/pipeline')({
  ssr: false,
  validateSearch: (search) => pipelineSearchSchema.catch({ tab: 'review' }).parse(search),
  component: PipelineRoute,
});

function PipelineRoute() {
  const { orgId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleTabChange = useCallback(
    (nextTab: PipelineSearch['tab']) => {
      navigate({ search: { tab: nextTab } });
    },
    [navigate],
  );
  const renderPipelineDashboard = useCallback(
    (org: MyOrg) => <GlobalPipelineDashboard org={org} activeTab={tab} onTabChange={handleTabChange} />,
    [handleTabChange, tab],
  );

  return (
    <OrgRouteShell orgId={orgId} errorTitle="Failed to load pipeline">
      {renderPipelineDashboard}
    </OrgRouteShell>
  );
}
