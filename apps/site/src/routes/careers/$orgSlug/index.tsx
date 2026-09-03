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
import { buildBreadcrumbJsonLd, buildOrganizationJsonLd, jsonLdMeta } from '@/lib/seo/json-ld';
import { boundedSeoDescription, buildSeoHead } from '@/lib/seo/public';

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
  head: ({ loaderData, match, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: 'Careers | Comitium' }],
      };
    }

    const orgName = loaderData.page.org.name;
    const description = boundedSeoDescription(
      loaderData.page.org.description,
      `Browse open roles at ${orgName} on Comitium.`,
    );
    const orgSlug = loaderData.page.org.careersSlug ?? params.orgSlug;
    const path = `/careers/${orgSlug}`;
    const head = buildSeoHead({
      title: `${orgName} Careers | Comitium`,
      description,
      path,
      noindex: Object.keys(match.search).length > 0,
    });
    const organizationJsonLd = buildOrganizationJsonLd({
      name: loaderData.page.org.name,
      path,
      website: loaderData.page.org.website,
      logo: loaderData.page.org.logo,
    });
    const structuredData = [
      jsonLdMeta(
        buildBreadcrumbJsonLd([
          { name: 'Jobs', path: '/jobs' },
          { name: `${orgName} Careers`, path },
        ]),
      ),
    ];

    if (organizationJsonLd) {
      structuredData.push(jsonLdMeta(organizationJsonLd));
    }

    return {
      ...head,
      meta: [...head.meta, ...structuredData],
    };
  },
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
