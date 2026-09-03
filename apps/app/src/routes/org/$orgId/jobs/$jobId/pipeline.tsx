import { uuidSchema } from '@comitium/schemas/public';
import { FeatureErrorFallback } from '@comitium/ui/error-fallbacks';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { z } from 'zod';
import { useJobDetailRouteOrg } from '@/components/features/job-detail/job-detail-route-context';
import { type PipelineTab, PipelineView } from '@/components/features/pipeline';

const pipelineSearchSchema = z.object({
  tab: z.enum(['review', 'active', 'offer', 'hired', 'archived']).default('active'),
  selected: uuidSchema.optional(),
});

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/pipeline')({
  ssr: false,
  validateSearch: (search) => pipelineSearchSchema.catch({ tab: 'active' }).parse(search),
  component: PipelinePage,
});

function PipelinePage() {
  const { jobId } = Route.useParams();
  const { tab, selected } = Route.useSearch();
  const navigate = Route.useNavigate();
  const org = useJobDetailRouteOrg();

  const handleTabChange = useCallback(
    (tab: PipelineTab) => {
      navigate({ search: (prev) => ({ ...prev, tab }) });
    },
    [navigate],
  );

  const handleSelectedChange = useCallback(
    (selected: string | null) => {
      navigate({ search: (prev) => ({ ...prev, selected: selected ?? undefined }) });
    },
    [navigate],
  );

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <FeatureErrorFallback {...props} title="Failed to load pipeline" className="h-full" />
      )}
    >
      <PipelineView
        org={org}
        jobId={jobId}
        activeTab={tab}
        onTabChange={handleTabChange}
        selectedApplicationId={selected ?? null}
        onSelectedApplicationChange={handleSelectedChange}
      />
    </ErrorBoundary>
  );
}
