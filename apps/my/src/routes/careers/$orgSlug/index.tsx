import type { CareerJobsParams } from '@comitium/jobs/api';
import { CareersPage } from '@comitium/jobs/careers';
import { CAREERS_JOBS_LIMIT } from '@comitium/jobs/constants';
import { careerPageQueryOptions } from '@comitium/jobs/query-options';
import { EMPLOYMENT_TYPE_VALUES, LOCATION_TYPE_VALUES } from '@comitium/schemas/job-enums';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { publicJobsApi } from '@/lib/public-jobs-api';

type CareersSearch = Pick<CareerJobsParams, 'department' | 'employmentType' | 'location' | 'locationType'>;

const careersSearchSchema = z.object({
  department: z.string().optional(),
  location: z.string().optional(),
  locationType: z.enum(LOCATION_TYPE_VALUES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
});

function cleanFilters(filters: CareersSearch): CareersSearch {
  const cleaned: CareersSearch = {};

  if (filters.location) {
    cleaned.location = filters.location;
  }

  if (filters.locationType) {
    cleaned.locationType = filters.locationType;
  }

  if (filters.employmentType) {
    cleaned.employmentType = filters.employmentType;
  }

  if (filters.department) {
    cleaned.department = filters.department;
  }

  return cleaned;
}

export const Route = createFileRoute('/careers/$orgSlug/')({
  validateSearch: (search) => careersSearchSchema.catch({}).parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, context, deps }) => {
    const page = await context.queryClient.ensureQueryData(
      careerPageQueryOptions(publicJobsApi, params.orgSlug, { ...deps, limit: CAREERS_JOBS_LIMIT }),
    );

    return { page, filters: deps };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.page.org.name ?? 'Careers'} | Comitium` },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  pendingComponent: PageLoader,
  component: CareersRoutePage,
});

function CareersRoutePage() {
  const navigate = useNavigate();
  const { filters: initialFilters, page } = Route.useLoaderData();
  const filters = Route.useSearch();
  const orgSlug = page.org.careersSlug;

  const handleFiltersChange = useCallback(
    (nextFilters: CareersSearch) => {
      navigate({
        to: '/careers/$orgSlug',
        params: { orgSlug },
        search: cleanFilters(nextFilters),
        replace: true,
      });
    },
    [navigate, orgSlug],
  );

  return (
    <CareersPage
      api={publicJobsApi}
      org={page.org}
      initialJobs={page.jobs}
      departments={page.departments}
      initialFilters={initialFilters}
      filters={filters}
      onFiltersChange={handleFiltersChange}
    />
  );
}
