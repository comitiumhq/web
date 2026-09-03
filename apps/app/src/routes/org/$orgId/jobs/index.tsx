import { uuidSchema } from '@comitium/schemas/public';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { OrgRouteShell } from '@/components/auth/org-route-shell';
import { JobsListContent, type JobsListFilters } from '@/components/features/jobs-list/jobs-list-content';

const searchSchema = z.object({
  status: z.enum(['all', 'open', 'draft', 'closed']).default('all'),
  departmentId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
});

export const Route = createFileRoute('/org/$orgId/jobs/')({
  ssr: false,
  validateSearch: (search) => searchSchema.catch({ status: 'all' }).parse(search),
  component: JobsListPage,
});

function JobsListPage() {
  const { orgId } = Route.useParams();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleFiltersChange = useCallback(
    (value: JobsListFilters) => {
      navigate({ search: value });
    },
    [navigate],
  );
  const renderJobsList = useCallback(
    () => <JobsListContent orgId={orgId} filters={filters} onFiltersChange={handleFiltersChange} />,
    [filters, handleFiltersChange, orgId],
  );

  return (
    <OrgRouteShell orgId={orgId} errorTitle="Failed to load jobs">
      {renderJobsList}
    </OrgRouteShell>
  );
}
