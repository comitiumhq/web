import type { JobListItem } from '@comitium/schemas/public-jobs';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { DESKTOP_BREAKPOINT } from '@comitium/ui/config';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@comitium/ui/drawer';
import { EmptyState } from '@comitium/ui/empty-state';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { BriefcaseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicJobsApi } from '../../api';
import { JOBS_PAGE_LIMIT } from '../../constants';
import { type CareerJobIdentity, useQueryCareerJob } from '../../queries/use-query-career-jobs';
import { getFlatJobsList, useQueryJobs } from '../../queries/use-query-jobs';
import type { CareerJob } from '../../schemas/careers';
import { type JobBoardFilters, JobBoardHeader } from './job-board-header';
import { JobDetail } from './job-detail';
import { JobList } from './job-list';
import { JobDetailSkeleton } from './skeletons';

const APP_HEADER_HEIGHT_PX = 64;
const JOB_BOARD_PANEL_GAP_PX = 16;
const STICKY_SEARCH_HEADER_HEIGHT_PX = 60;
const DETAIL_PANEL_TOP_PX = STICKY_SEARCH_HEADER_HEIGHT_PX + JOB_BOARD_PANEL_GAP_PX;
const DETAIL_PANEL_HEIGHT_OFFSET_PX = APP_HEADER_HEIGHT_PX + DETAIL_PANEL_TOP_PX + JOB_BOARD_PANEL_GAP_PX;
const DETAIL_PANEL_CLASS_NAME =
  'sticky top-[var(--job-board-detail-top)] h-[var(--job-board-detail-height)] gap-0 overflow-hidden py-0';
const DETAIL_PANEL_STYLE: DetailPanelStyle = {
  '--job-board-detail-top': `${DETAIL_PANEL_TOP_PX}px`,
  '--job-board-detail-height': `calc(100dvh - ${DETAIL_PANEL_HEIGHT_OFFSET_PX}px)`,
};

type DetailPanelStyle = CSSProperties & {
  '--job-board-detail-top': string;
  '--job-board-detail-height': string;
};

interface JobBoardProps {
  api: PublicJobsApi;
  selectedPosting?: CareerJobIdentity | null;
  filters?: JobBoardFilters;
  resolveApplyUrl: (canonicalJobUrl: string) => string;
}

interface JobBoardStatusPanelProps {
  type: 'error' | 'empty';
  hasActiveFilters?: boolean;
  onClearFilters: () => void;
}

type DetailJob = JobListItem | CareerJob;

function cleanFilters(filters: JobBoardFilters): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)),
  );
}

function hasJobBoardFilters(filters: JobBoardFilters): boolean {
  const { sort: _sort, ...filterFields } = filters;

  return Object.keys(cleanFilters(filterFields)).length > 0;
}

function getLoadingMoreSkeletonCount(totalJobs: number | null, renderedJobsCount: number) {
  if (totalJobs == null) {
    return JOBS_PAGE_LIMIT;
  }

  const remainingJobsCount = totalJobs - renderedJobsCount;

  if (remainingJobsCount <= 0) {
    return JOBS_PAGE_LIMIT;
  }

  return Math.min(JOBS_PAGE_LIMIT, remainingJobsCount);
}

function isSelectedPosting(job: JobListItem, selectedPosting: CareerJobIdentity): boolean {
  return job.orgSlug === selectedPosting.orgSlug && job.postingSlug === selectedPosting.postingSlug;
}

function getSelectedPostingKey(selectedPosting?: CareerJobIdentity | null): string | null {
  if (!selectedPosting) {
    return null;
  }

  return `${selectedPosting.orgSlug}/${selectedPosting.postingSlug}`;
}

function getCareersUrl(job: DetailJob): string {
  const orgSlug = 'orgSlug' in job ? job.orgSlug : job.org.careersSlug;

  return `/careers/${orgSlug}`;
}

function getApplyPath(job: DetailJob): string {
  const orgSlug = 'orgSlug' in job ? job.orgSlug : job.org.careersSlug;

  return `/careers/${orgSlug}/jobs/${job.postingSlug}/apply`;
}

function JobBoardStatusPanel({ type, hasActiveFilters = false, onClearFilters }: JobBoardStatusPanelProps) {
  if (type === 'error') {
    return (
      <Card className="gap-0 py-0">
        <EmptyState
          icon={WarningCircleIcon}
          title="Jobs failed to load"
          description="Refresh the page or try again in a moment."
          className="min-h-88"
        />
      </Card>
    );
  }

  const title = hasActiveFilters ? 'No matching roles' : 'No open roles yet';
  const description = hasActiveFilters
    ? 'Try a different search or clear the selected filters.'
    : 'Check back soon for new opportunities.';

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center px-6 pb-12 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <BriefcaseIcon className="size-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="text-heading-20">{title}</h2>
      <p className="mt-2 max-w-sm text-copy-14 text-muted-foreground">{description}</p>

      {hasActiveFilters && (
        <Button variant="outline" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

function SelectedJobUnavailable({ onClearSelection }: { onClearSelection: () => void }) {
  return (
    <EmptyState
      icon={WarningCircleIcon}
      title="Job unavailable"
      description="This posting may have closed or the link may no longer match a published role."
      className="min-h-96"
    >
      <Button variant="outline" className="mt-4" onClick={onClearSelection}>
        Show listed roles
      </Button>
    </EmptyState>
  );
}

export function JobBoard({ api, selectedPosting = null, filters = {}, resolveApplyUrl }: JobBoardProps) {
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const openedMobilePostingRef = useRef<string | null>(null);
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);
  const hasActiveFilters = hasJobBoardFilters(filters);
  const selectedPostingKey = getSelectedPostingKey(selectedPosting);

  const updateFilters = useCallback(
    (newFilters: JobBoardFilters) => {
      const cleaned = cleanFilters(newFilters);

      navigate({
        to: '/jobs',
        search: cleaned,
        replace: true,
      });
    },
    [navigate],
  );

  const clearSelection = useCallback(() => {
    navigate({
      to: '/jobs',
      search: (prev: Record<string, unknown>) => {
        const { jobId: _jobId, orgSlug: _orgSlug, postingSlug: _postingSlug, ...rest } = prev;

        return rest;
      },
      replace: true,
    });
  }, [navigate]);

  const clearFilters = useCallback(() => {
    navigate({
      to: '/jobs',
      search: filters.sort ? { sort: filters.sort } : {},
      replace: true,
    });
  }, [filters.sort, navigate]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useQueryJobs(api, {
    search: filters.search,
    location: filters.location,
    locationType: filters.locationType,
    employmentType: filters.employmentType,
    category: filters.category,
    salaryMin: filters.salaryMin,
    salaryMax: filters.salaryMax,
    sort: filters.sort,
    limit: JOBS_PAGE_LIMIT,
  });

  const jobs = useMemo(() => getFlatJobsList(data), [data]);
  const apiTotalJobs = data?.pages[0]?.pagination.total ?? null;
  const loadingMoreSkeletonCount = getLoadingMoreSkeletonCount(apiTotalJobs, jobs.length);
  const hasNoResults = !isLoading && !isError && jobs.length === 0;
  const showJobBoardHeader = !hasNoResults || hasActiveFilters;
  const selectedListJob = useMemo(() => {
    if (jobs.length === 0) {
      return null;
    }

    if (selectedPosting) {
      const selectedFromList = jobs.find((job) => isSelectedPosting(job, selectedPosting));

      if (selectedFromList) {
        return selectedFromList;
      }

      return null;
    }

    return jobs[0];
  }, [jobs, selectedPosting]);
  const selectedJobQuery = useQueryCareerJob(api, selectedPosting && !selectedListJob ? selectedPosting : null);
  const detailJob = selectedPosting ? (selectedListJob ?? selectedJobQuery.data ?? null) : selectedListJob;
  const selectedCareersUrl = detailJob ? getCareersUrl(detailJob) : null;
  const selectedApplyUrl = detailJob ? resolveApplyUrl(getApplyPath(detailJob)) : null;

  const handleSelectJob = useCallback(
    (job: JobListItem) => {
      navigate({
        to: '/jobs',
        search: (prev: Record<string, unknown>) => {
          const { jobId: _jobId, ...rest } = prev;

          return { ...rest, orgSlug: job.orgSlug, postingSlug: job.postingSlug };
        },
        replace: true,
      });

      if (!isDesktop) {
        setMobileDrawerOpen(true);
      }
    },
    [isDesktop, navigate],
  );

  const handleFetchNextPage = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    const mainElement = document.querySelector('main');

    if (mainElement instanceof HTMLElement) {
      setScrollElement(mainElement);
    }
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setMobileDrawerOpen(false);

      return;
    }

    if (!selectedPostingKey) {
      openedMobilePostingRef.current = null;

      return;
    }

    if (openedMobilePostingRef.current === selectedPostingKey) {
      return;
    }

    openedMobilePostingRef.current = selectedPostingKey;
    setMobileDrawerOpen(true);
  }, [isDesktop, selectedPostingKey]);

  let detailContent: React.ReactNode;

  if (isError) {
    detailContent = (
      <EmptyState
        icon={WarningCircleIcon}
        title="Jobs failed to load"
        description="Refresh the page or try again in a moment."
        className="min-h-96"
      />
    );
  } else if (detailJob) {
    detailContent = <JobDetail job={detailJob} careersUrl={selectedCareersUrl} applyUrl={selectedApplyUrl} />;
  } else if (selectedPosting && selectedJobQuery.isError) {
    detailContent = <SelectedJobUnavailable onClearSelection={clearSelection} />;
  } else if (isLoading || selectedJobQuery.isLoading) {
    detailContent = <JobDetailSkeleton />;
  } else {
    detailContent = null;
  }

  let boardContent: React.ReactNode;

  if (isError) {
    boardContent = (
      <div className="lg:col-span-2">
        <JobBoardStatusPanel type="error" onClearFilters={clearFilters} />
      </div>
    );
  } else if (hasNoResults) {
    boardContent = (
      <div className="lg:col-span-2">
        <JobBoardStatusPanel type="empty" hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
      </div>
    );
  } else {
    boardContent = (
      <>
        <div className="min-w-0">
          <JobList
            jobs={jobs}
            loading={isLoading}
            loadingMore={isFetchingNextPage}
            error={isError}
            hasActiveFilters={hasActiveFilters}
            hasNextPage={hasNextPage}
            loadingSkeletonCount={JOBS_PAGE_LIMIT}
            loadingMoreSkeletonCount={loadingMoreSkeletonCount}
            scrollElement={scrollElement}
            selectedJob={selectedListJob}
            onSelectJob={handleSelectJob}
            onLoadMore={handleFetchNextPage}
            onClearFilters={clearFilters}
          />
        </div>

        <div className="hidden lg:block">
          <Card className={DETAIL_PANEL_CLASS_NAME} style={DETAIL_PANEL_STYLE}>
            {detailContent}
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {showJobBoardHeader && <JobBoardHeader api={api} filters={filters} onFiltersChange={updateFilters} />}

      <div
        className="mx-auto grid max-w-[96rem] gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(24rem,0.82fr)_minmax(32rem,1.18fr)] xl:grid-cols-[minmax(28rem,0.82fr)_minmax(42rem,1.18fr)]"
        style={DETAIL_PANEL_STYLE}
      >
        {boardContent}
      </div>

      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="h-[90vh] max-h-[90vh]">
          <DrawerTitle className="sr-only">{detailJob?.title || selectedListJob?.title || 'Job Details'}</DrawerTitle>
          <DrawerDescription className="sr-only">Selected job details and application actions.</DrawerDescription>
          <div className="min-h-0 flex-1 overflow-hidden">{detailContent}</div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
