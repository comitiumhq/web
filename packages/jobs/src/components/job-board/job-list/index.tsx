import type { JobListItem as JobListItemType } from '@comitium/schemas/public-jobs';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { EmptyState } from '@comitium/ui/empty-state';
import { BriefcaseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useVirtualizer, type VirtualItem, type Virtualizer } from '@tanstack/react-virtual';
import { type CSSProperties, memo, type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { getJobListSkeletonWidthClassName, JobListSkeleton, JobListSkeletonItem } from '../skeletons';
import { JobListItem } from './job-list-item';

const JOB_LIST_ROW_ESTIMATE_PX = 148;
const JOB_LIST_OVERSCAN_COUNT = 8;
const JOB_LIST_LOAD_AHEAD_COUNT = 6;

function getLastVirtualIndex(virtualItems: VirtualItem[]) {
  if (virtualItems.length === 0) {
    return null;
  }

  return virtualItems[virtualItems.length - 1].index;
}

function getLoadMoreBoundaryIndex(jobsCount: number) {
  return Math.max(jobsCount - 1 - JOB_LIST_LOAD_AHEAD_COUNT, 0);
}

function shouldRequestMoreJobs({
  hasNextPage,
  jobsCount,
  lastVirtualIndex,
  loadingMore,
  requestInFlight,
}: {
  hasNextPage?: boolean;
  jobsCount: number;
  lastVirtualIndex: number | null;
  loadingMore?: boolean;
  requestInFlight: boolean;
}) {
  if (!hasNextPage || loadingMore || jobsCount === 0 || requestInFlight) {
    return false;
  }

  if (lastVirtualIndex == null) {
    return false;
  }

  return lastVirtualIndex >= getLoadMoreBoundaryIndex(jobsCount);
}

interface JobListProps {
  jobs: JobListItemType[];
  loading?: boolean;
  error?: boolean;
  hasActiveFilters?: boolean;
  hasNextPage?: boolean;
  loadingMore?: boolean;
  loadingSkeletonCount: number;
  loadingMoreSkeletonCount: number;
  scrollElement: HTMLElement | null;
  selectedJob: JobListItemType | null;
  onSelectJob: (job: JobListItemType) => void;
  onLoadMore: () => void;
  onClearFilters: () => void;
}

interface JobListRowProps {
  job: JobListItemType;
  isSelected: boolean;
  isLast: boolean;
  onSelectJob: (job: JobListItemType) => void;
}

interface VirtualizedRowProps {
  index: number;
  start: number;
  measureElement: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}

const VirtualizedRow = memo(function VirtualizedRow({ index, start, measureElement, children }: VirtualizedRowProps) {
  const style = useMemo<CSSProperties>(() => ({ transform: `translateY(${start}px)` }), [start]);

  return (
    <div data-index={index} ref={measureElement} className="absolute top-0 left-0 w-full" style={style}>
      {children}
    </div>
  );
});

const JobListRow = memo(function JobListRow({ job, isSelected, isLast, onSelectJob }: JobListRowProps) {
  const handleClick = useCallback(() => {
    onSelectJob(job);
  }, [job, onSelectJob]);

  return <JobListItem job={job} isSelected={isSelected} isLast={isLast} onClick={handleClick} />;
});

export function JobList({
  jobs,
  loading,
  error,
  hasActiveFilters,
  hasNextPage,
  loadingMore,
  loadingSkeletonCount,
  loadingMoreSkeletonCount,
  scrollElement,
  selectedJob,
  onSelectJob,
  onLoadMore,
  onClearFilters,
}: JobListProps) {
  const virtualRowCount = jobs.length + (loadingMore ? loadingMoreSkeletonCount : 0);
  const requestedLoadMoreRef = useRef(false);

  const getItemKey = useCallback(
    (index: number) => {
      const job = jobs[index];

      if (job) {
        return job.id;
      }

      return `loading-${index - jobs.length}`;
    },
    [jobs],
  );

  const handleVirtualizerChange = useCallback(
    (instance: Virtualizer<HTMLElement, HTMLDivElement>) => {
      const virtualItems = instance.getVirtualItems();
      const lastVirtualIndex = getLastVirtualIndex(virtualItems);

      if (
        !shouldRequestMoreJobs({
          hasNextPage,
          jobsCount: jobs.length,
          lastVirtualIndex,
          loadingMore,
          requestInFlight: requestedLoadMoreRef.current,
        })
      ) {
        return;
      }

      requestedLoadMoreRef.current = true;
      onLoadMore();
    },
    [hasNextPage, jobs.length, loadingMore, onLoadMore],
  );

  const rowVirtualizer = useVirtualizer<HTMLElement, HTMLDivElement>({
    count: virtualRowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => JOB_LIST_ROW_ESTIMATE_PX,
    overscan: JOB_LIST_OVERSCAN_COUNT,
    getItemKey,
    onChange: handleVirtualizerChange,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const listStyle = useMemo<CSSProperties>(() => ({ height: `${totalSize}px` }), [totalSize]);

  useEffect(() => {
    if (!loadingMore) {
      requestedLoadMoreRef.current = false;
    }
  }, [loadingMore]);

  const renderVirtualRow = useCallback(
    (virtualRow: VirtualItem) => {
      const job = jobs[virtualRow.index];
      const isLastVirtualRow = virtualRow.index === virtualRowCount - 1;

      return (
        <VirtualizedRow
          key={virtualRow.key}
          index={virtualRow.index}
          start={virtualRow.start}
          measureElement={rowVirtualizer.measureElement}
        >
          {job ? (
            <JobListRow
              job={job}
              isSelected={selectedJob?.id === job.id}
              isLast={isLastVirtualRow && !hasNextPage}
              onSelectJob={onSelectJob}
            />
          ) : (
            <JobListSkeletonItem
              widthClassName={getJobListSkeletonWidthClassName(virtualRow.index - jobs.length)}
              isLast={isLastVirtualRow}
            />
          )}
        </VirtualizedRow>
      );
    },
    [hasNextPage, jobs, onSelectJob, rowVirtualizer.measureElement, selectedJob?.id, virtualRowCount],
  );

  if (loading) {
    return <JobListSkeleton count={loadingSkeletonCount} />;
  }

  if (error) {
    return (
      <Card className="gap-0 py-0">
        <EmptyState
          icon={WarningCircleIcon}
          title="Jobs failed to load"
          description="Refresh the page or try again in a moment."
        />
      </Card>
    );
  }

  if (jobs.length === 0) {
    if (hasActiveFilters) {
      return (
        <Card className="gap-0 py-0">
          <EmptyState
            icon={BriefcaseIcon}
            title="No matching roles"
            description="Try a different search or clear the selected filters."
          >
            <Button variant="outline" className="mt-4" onClick={onClearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        </Card>
      );
    }

    return (
      <Card className="gap-0 py-0">
        <EmptyState
          icon={BriefcaseIcon}
          title="No open roles yet"
          description="Check back soon for new opportunities."
        />
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="relative w-full [overflow-anchor:none]" style={listStyle}>
        {virtualRows.map(renderVirtualRow)}
      </div>
    </Card>
  );
}
