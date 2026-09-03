import { EXPLORER_TX_URL } from '@comitium/chain/network';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { SKELETON_CARD_COUNT } from '@comitium/ui/config';
import { PageContainer } from '@comitium/ui/page-container';
import { Skeleton } from '@comitium/ui/skeleton';
import { CubeIcon, GlobeSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import type { PublicJobsApi } from '../../api';
import { CAREERS_JOBS_LIMIT } from '../../constants';
import { getFlatCareerJobs, useQueryCareerJobs } from '../../queries/use-query-career-jobs';
import type { CareerDepartment, CareerJobsResponse, CareerOrg } from '../../schemas/careers';
import { CareerFilterSelects, type CareerFilters } from './career-filter-selects';
import { CareerJobsList } from './career-jobs-list';

interface CareersPageProps {
  api: PublicJobsApi;
  org: CareerOrg;
  initialJobs: CareerJobsResponse;
  departments: CareerDepartment[];
  initialFilters: CareerFilters;
  filters: CareerFilters;
  onFiltersChange: (filters: CareerFilters) => void;
}

const countChipClassName =
  'inline-flex h-6 min-w-7 items-center justify-center rounded-4xl bg-muted px-2 text-label-12 text-muted-foreground tabular-nums';
const careerFilterKeys = ['department', 'location', 'locationType', 'employmentType'] as const;

function hasCareerFilters(filters: CareerFilters) {
  return Boolean(filters.department || filters.location || filters.locationType || filters.employmentType);
}

function areCareerFiltersEqual(left: CareerFilters, right: CareerFilters) {
  return careerFilterKeys.every((key) => left[key] === right[key]);
}

export function CareersPage({
  api,
  org,
  initialJobs,
  departments,
  initialFilters,
  filters,
  onFiltersChange,
}: CareersPageProps) {
  const orgName = org.name || 'Organization';
  const initialJobsForFilters = areCareerFiltersEqual(filters, initialFilters) ? initialJobs : undefined;
  const { data, isError, isLoading } = useQueryCareerJobs(api, org.careersSlug, {
    initialPage: initialJobsForFilters,
    ...filters,
    limit: CAREERS_JOBS_LIMIT,
  });
  const jobs = useMemo(() => getFlatCareerJobs(data), [data]);
  const totalJobs = data?.pagination.total ?? initialJobsForFilters?.pagination.total ?? jobs.length;
  const hasActiveFilters = hasCareerFilters(filters);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className="min-h-full bg-background">
      <PageContainer as="section" size="list" className="py-6 sm:py-8">
        <Card className="mb-6 gap-0 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <CompanyAvatar name={org.name} logo={org.logo} className="size-12 shrink-0 sm:size-14" />
              <h1 className="min-w-0 text-heading-24 tracking-normal">{orgName}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {org.website && (
                <Button variant="outline" size="icon" aria-label="Open organization site" asChild>
                  <a href={org.website} target="_blank" rel="noreferrer">
                    <GlobeSimpleIcon />
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                aria-label="View organization creation transaction on BaseScan"
                asChild
              >
                <a href={`${EXPLORER_TX_URL}${org.txHash}`} target="_blank" rel="noopener noreferrer">
                  <CubeIcon />
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-heading-20">Open roles</h2>
              {isLoading ? (
                <Skeleton className={countChipClassName} />
              ) : (
                <span className={countChipClassName}>{totalJobs}</span>
              )}
            </div>

            <CareerFilterSelects
              api={api}
              orgSlug={org.careersSlug}
              departments={departments}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>
        </Card>

        <CareerJobsList
          jobs={jobs}
          loading={isLoading}
          error={isError}
          hasActiveFilters={hasActiveFilters}
          loadingSkeletonCount={SKELETON_CARD_COUNT}
          onClearFilters={handleClearFilters}
        />
      </PageContainer>
    </div>
  );
}
