import { uuidSchema } from '@comitium/schemas/public';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { z } from 'zod';
import { OrgRouteShell } from '@/components/auth/org-route-shell';
import { JobsListContent, type JobsListFilters } from '@/components/features/jobs-list/jobs-list-content';

const searchSchema = z.object({
  status: z.enum(['all', 'open', 'draft', 'closed']).default('all'),
  departmentId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  create: z.boolean().optional(),
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

  useEffect(() => {
    if (!filters.create) {
      return;
    }

    navigate({
      search: {
        status: filters.status,
        departmentId: filters.departmentId,
        locationId: filters.locationId,
      },
      replace: true,
    });
  }, [filters.create, filters.departmentId, filters.locationId, filters.status, navigate]);

  const handleFiltersChange = useCallback(
    (value: JobsListFilters) => {
      navigate({ search: value });
    },
    [navigate],
  );
  const renderJobsList = useCallback(
    () => (
      <JobsListContent
        orgId={orgId}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        createDialogRequested={filters.create === true}
      />
    ),
    [filters, handleFiltersChange, orgId],
  );

  return (
    <OrgRouteShell orgId={orgId} errorTitle="Failed to load jobs">
      {renderJobsList}
    </OrgRouteShell>
  );
}
