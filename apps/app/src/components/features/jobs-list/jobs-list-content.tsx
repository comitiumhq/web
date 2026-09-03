import type { JobDraftListItem, OrgJobListItem } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { Input } from '@comitium/ui/input';
import { PageContainer } from '@comitium/ui/page-container';
import { BriefcaseIcon, MagnifyingGlassIcon, MagnifyingGlassMinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useQueryJobCreationContext } from '@/hooks/queries/use-query-job-creation-context';
import { type StatusFilter, useJobsWithDrafts } from '@/hooks/queries/use-query-jobs-with-drafts';
import { useQueryOrgDepartments, useQueryOrgLocations } from '@/hooks/queries/use-query-org-structure';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';
import { isDefined } from '@/lib/utils';

import { CreateJobDialog } from './create-job-dialog';
import type { JobsRow } from './jobs-columns';
import { JobsFilters } from './jobs-filters';
import { JobsStatusTabs } from './jobs-status-tabs';
import { JobsTable } from './jobs-table';

export type { StatusFilter };

const ALL_FILTER_VALUE = 'all';

export interface JobsListFilters {
  status: StatusFilter;
  departmentId?: string;
  locationId?: string;
}

interface JobsListContentProps {
  orgId: string;
  filters: JobsListFilters;
  onFiltersChange: (filters: JobsListFilters) => void;
}

interface TextFilterFields {
  title: string | null;
  departmentId: string | null;
  locationId: string | null;
}

function nullableFilterValue(value: string) {
  if (value === ALL_FILTER_VALUE) {
    return undefined;
  }

  return value;
}

function matchesTextFilters(item: TextFilterFields, search: string, filters: JobsListFilters): boolean {
  if (search && !(item.title ?? '').toLowerCase().includes(search)) {
    return false;
  }

  if (filters.departmentId && item.departmentId !== filters.departmentId) {
    return false;
  }

  if (filters.locationId && item.locationId !== filters.locationId) {
    return false;
  }

  return true;
}

function toDraftRows(
  drafts: JobDraftListItem[],
  status: StatusFilter,
  search: string,
  filters: JobsListFilters,
): JobsRow[] {
  if (status !== 'all' && status !== 'draft') {
    return [];
  }

  return drafts
    .filter((draft) => matchesTextFilters(draft, search, filters))
    .map((draft): JobsRow => ({ kind: 'draft', id: draft.id, draft }));
}

function toJobRows(jobs: OrgJobListItem[], status: StatusFilter, search: string, filters: JobsListFilters): JobsRow[] {
  if (status === 'draft') {
    return [];
  }

  return jobs
    .filter((job) => job.status !== 'draft')
    .filter((job) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'open' && job.status === 'open') ||
        (status === 'closed' && job.status === 'closed');

      return matchesStatus && matchesTextFilters(job, search, filters);
    })
    .map((job): JobsRow => ({ kind: 'job', id: job.id, job }));
}

function computeStatusCounts(
  jobs: OrgJobListItem[],
  drafts: JobDraftListItem[],
  search: string,
  filters: JobsListFilters,
): Record<StatusFilter, number> {
  const matchingJobs = jobs.filter((job) => job.status !== 'draft' && matchesTextFilters(job, search, filters));
  const open = matchingJobs.filter((job) => job.status === 'open').length;
  const closed = matchingJobs.filter((job) => job.status === 'closed').length;
  const draft = drafts.filter((item) => matchesTextFilters(item, search, filters)).length;

  return { all: open + closed + draft, open, draft, closed };
}

export function JobsListContent({ orgId, filters, onFiltersChange }: JobsListContentProps) {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { status, departmentId, locationId } = filters;
  const { isAdmin } = usePermissions();
  const { data: creationContext } = useQueryJobCreationContext(orgId);
  const { data: departmentsData } = useQueryOrgDepartments(orgId);
  const { data: locationsData } = useQueryOrgLocations(orgId);
  const departments = departmentsData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const { jobs, drafts, isLoading } = useJobsWithDrafts(orgId);

  const searchTerm = debouncedSearch.trim().toLowerCase();

  const rows = useMemo<JobsRow[]>(
    () => [...toDraftRows(drafts, status, searchTerm, filters), ...toJobRows(jobs, status, searchTerm, filters)],
    [jobs, drafts, status, searchTerm, filters],
  );

  const counts = useMemo(
    () => computeStatusCounts(jobs, drafts, searchTerm, filters),
    [jobs, drafts, searchTerm, filters],
  );

  const updateFilters = useCallback(
    (changes: Partial<JobsListFilters>) => {
      onFiltersChange({ status, departmentId, locationId, ...changes });
    },
    [departmentId, locationId, onFiltersChange, status],
  );

  const handleStatusChange = useCallback(
    (value: StatusFilter) => {
      updateFilters({ status: value });
    },
    [updateFilters],
  );

  const handleDepartmentChange = useCallback(
    (value: string) => {
      updateFilters({ departmentId: nullableFilterValue(value) });
    },
    [updateFilters],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      updateFilters({ locationId: nullableFilterValue(value) });
    },
    [updateFilters],
  );

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    updateFilters({ departmentId: undefined, locationId: undefined });
  }, [updateFilters]);

  const canCreateJob =
    isDefined(creationContext) && (creationContext.orgWide || creationContext.departmentIds.length > 0);
  const activeFilterCount = (departmentId ? 1 : 0) + (locationId ? 1 : 0);
  const isGlobalEmpty = !isLoading && jobs.length === 0 && drafts.length === 0;

  const handleCreateJobClick = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const createJobButton = canCreateJob ? (
    <Button className="shrink-0" onClick={handleCreateJobClick}>
      <PlusIcon data-icon="inline-start" />
      New Job
    </Button>
  ) : null;

  const emptyState = isGlobalEmpty ? (
    <EmptyState
      icon={BriefcaseIcon}
      title="No jobs posted yet"
      description="Post your first job to start reviewing candidates."
    >
      {createJobButton && <div className="mt-5">{createJobButton}</div>}
    </EmptyState>
  ) : (
    <EmptyState
      icon={MagnifyingGlassMinusIcon}
      title="No jobs match your search"
      description="Try adjusting your filters or search term to find what you're looking for."
    />
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <h1 className="sr-only">Jobs</h1>

      {!isGlobalEmpty && (
        <PageContainer className="flex shrink-0 flex-col gap-4 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <JobsStatusTabs status={status} counts={counts} loading={isLoading} onChange={handleStatusChange} />

            <div className="flex w-full items-center gap-2 lg:ml-auto lg:w-auto">
              <div className="relative flex-1 lg:w-60 lg:flex-none">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-8"
                />
              </div>

              <JobsFilters
                departments={departments}
                locations={locations}
                departmentId={departmentId}
                locationId={locationId}
                activeCount={activeFilterCount}
                onDepartmentChange={handleDepartmentChange}
                onLocationChange={handleLocationChange}
                onClear={handleClearAdvancedFilters}
              />

              {createJobButton}
            </div>
          </div>
        </PageContainer>
      )}

      <div className="min-h-0 flex-1">
        <PageContainer className="flex h-full flex-col pb-6">
          <JobsTable
            orgId={orgId}
            rows={isGlobalEmpty ? [] : rows}
            isAdmin={isAdmin}
            loading={isGlobalEmpty ? false : isLoading}
            emptyState={emptyState}
          />
        </PageContainer>
      </div>

      <CreateJobDialog orgId={orgId} open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
