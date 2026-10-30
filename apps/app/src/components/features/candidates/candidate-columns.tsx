import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Badge } from '@comitium/ui/badge';
import { Skeleton } from '@comitium/ui/skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useCandidateDirectoryProfiles } from '@/hooks/use-candidate-directory-profiles';
import { useCandidateTags } from '@/hooks/use-candidate-tags';
import type { CandidateDirectoryRow } from '@/lib/candidates/search/candidate-query';
import { formatRelativeTime } from '@/lib/utils';

export function useCandidateColumns(orgId: string, rows: CandidateDirectoryRow[], onSourcesChanged: () => void) {
  const display = useCandidateDirectoryProfiles(orgId, rows, onSourcesChanged);
  const { tagMap } = useCandidateTags(orgId);

  return useMemo<ColumnDef<CandidateDirectoryRow>[]>(
    () => [
      {
        id: 'candidate',
        header: 'Candidate',
        enableSorting: false,
        meta: {
          gridSize: 'minmax(15rem, 2fr)',
          loadingCell: (
            <div className="flex h-10 min-w-0 flex-col justify-center gap-1.5">
              <Skeleton className="h-3.5 w-32 max-w-full" />
              <Skeleton className="h-3 w-44 max-w-full" />
            </div>
          ),
        },
        cell: ({ row: { original } }) => {
          const profile = display.profiles?.get(original.candidateId);
          let name = profile?.name ?? null;

          if (display.failed?.has(original.candidateId)) {
            name = 'Profile unavailable';
          }

          if (!original.profile && !original.searchIndex) {
            name = 'Unnamed candidate';
          }

          return (
            <div className="flex h-10 min-w-0 flex-col justify-center">
              {name ? <span className="block truncate text-label-14">{name}</span> : <Skeleton className="h-4 w-32" />}
              {profile?.subtitle && (
                <span className="mt-1 block truncate text-xs text-muted-foreground">{profile.subtitle}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'job',
        header: 'Job / Current stage',
        enableSorting: false,
        meta: {
          gridSize: 'minmax(12rem, 1.5fr)',
          loadingCell: (
            <div className="flex h-10 min-w-0 flex-col justify-center gap-1.5">
              <Skeleton className="h-3.5 w-40 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
          ),
        },
        cell: ({ row: { original } }) => {
          const app = original.matchedApplication;

          return app ? (
            <div className="min-w-0">
              <span className="block truncate">{app.jobTitle}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {app.terminalOutcome ? APPLICATION_TERMINAL_OUTCOME_LABEL[app.terminalOutcome] : (app.stageName ?? '—')}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'location',
        header: 'Location',
        enableSorting: false,
        meta: { gridSize: 'minmax(10rem, 1fr)', skeletonClassName: 'w-28' },
        cell: ({ row }) => (
          <span className="block truncate text-muted-foreground">
            {display.profiles?.get(row.original.candidateId)?.location ?? '—'}
          </span>
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        enableSorting: false,
        meta: { gridSize: 'minmax(8rem, 1fr)', skeletonClassName: 'h-5 w-16 rounded-full' },
        cell: ({ row }) => (
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {row.original.tagIds.slice(0, 2).map((id) => (
              <Badge key={id} variant="secondary" className="max-w-28 truncate">
                {tagMap.get(id)?.label ?? '…'}
              </Badge>
            ))}
            {row.original.tagIds.length > 2 && (
              <span className="text-xs text-muted-foreground">+{row.original.tagIds.length - 2}</span>
            )}
          </div>
        ),
      },
      {
        id: 'added',
        header: 'Added',
        enableSorting: false,
        meta: { gridSize: '10rem', skeletonClassName: 'w-16' },
        cell: ({ row }) => (
          <time
            className="whitespace-nowrap text-xs text-muted-foreground"
            dateTime={row.original.firstSeenAt}
            title={new Date(row.original.firstSeenAt).toLocaleString()}
          >
            {formatRelativeTime(row.original.firstSeenAt)}
          </time>
        ),
      },
    ],
    [display.profiles, display.failed, tagMap],
  );
}
