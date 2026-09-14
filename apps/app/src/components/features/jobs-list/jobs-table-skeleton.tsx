import { Card } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import { type CSSProperties, useMemo } from 'react';
import { cn } from '@/lib/utils';

import type { JobsRow } from './jobs-columns';

const SKELETON_ROWS = Array.from({ length: 8 }, (_, index) => index);

interface JobsTableSkeletonProps {
  columns: ColumnDef<JobsRow>[];
  gridMinWidth: string;
}

export function JobsTableSkeleton({ columns, gridMinWidth }: JobsTableSkeletonProps) {
  const gridTemplateColumns = useMemo(
    () => columns.map((column) => column.meta?.gridSize ?? '150px').join(' '),
    [columns],
  );
  const gridStyle = useMemo<CSSProperties>(() => ({ gridTemplateColumns }), [gridTemplateColumns]);

  return (
    <Card size="sm" className="min-h-0 overflow-hidden border border-surface-border py-0 ring-0">
      <div className="overflow-x-auto">
        <div style={{ minWidth: gridMinWidth }}>
          <div className="grid min-h-11 items-center bg-table-header" style={gridStyle}>
            {columns.map((column, index) => (
              <div key={column.id ?? index} className={cn('min-w-0 overflow-hidden px-3', index === 0 && 'pl-4')}>
                <JobsTableHeaderSkeleton columnId={column.id} />
              </div>
            ))}
          </div>

          {SKELETON_ROWS.map((rowIndex) => (
            <div
              key={rowIndex}
              className="grid min-h-[68px] items-center border-b border-separator last:border-b-0"
              style={gridStyle}
            >
              {columns.map((column, columnIndex) => (
                <div
                  key={column.id ?? columnIndex}
                  className={cn('min-w-0 overflow-hidden px-3 py-3', columnIndex === 0 && 'pl-4')}
                >
                  <JobsTableCellSkeleton columnId={column.id} rowIndex={rowIndex} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function JobsTableHeaderSkeleton({ columnId }: { columnId?: string }) {
  if (columnId === 'actions') {
    return null;
  }

  const widths: Record<string, string> = {
    job: 'w-8',
    candidates: 'w-20',
    team: 'w-20',
    interviewPlan: 'w-24',
    stake: 'w-10',
    status: 'w-12',
    posting: 'w-14',
    updated: 'w-14',
  };

  return <Skeleton className={cn('h-3.5 max-w-full', widths[columnId ?? ''] ?? 'w-16')} />;
}

function JobsTableCellSkeleton({ columnId, rowIndex }: { columnId?: string; rowIndex: number }) {
  if (columnId === 'job') {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className={cn('h-3.5 max-w-full', rowIndex % 3 === 0 ? 'w-52' : 'w-44')} />
        <Skeleton className={cn('h-3 max-w-full', rowIndex % 2 === 0 ? 'w-36' : 'w-28')} />
      </div>
    );
  }

  if (columnId === 'team') {
    return (
      <div className="flex items-center [&>*+*]:-ml-1.5">
        <Skeleton className="size-7 rounded-full ring-2 ring-card" />
        {rowIndex % 3 !== 1 && <Skeleton className="size-7 rounded-full ring-2 ring-card" />}
      </div>
    );
  }

  if (columnId === 'status' || columnId === 'posting') {
    return <Skeleton className={cn('h-5 rounded-4xl', rowIndex % 3 === 0 ? 'w-20' : 'w-16')} />;
  }

  if (columnId === 'actions') {
    return <Skeleton className="ml-auto size-7 rounded-full" />;
  }

  const widths: Record<string, string> = {
    candidates: 'w-8',
    interviewPlan: rowIndex % 2 === 0 ? 'w-28' : 'w-24',
    stake: 'w-12',
    updated: 'w-14',
  };

  return <Skeleton className={cn('h-3.5 max-w-full', widths[columnId ?? ''] ?? 'w-16')} />;
}
