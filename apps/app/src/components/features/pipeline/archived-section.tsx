import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { ScrollArea } from '@comitium/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comitium/ui/table';
import { useInfiniteScrollSentinel } from '@comitium/ui/use-infinite-scroll-sentinel';
import { memo, useCallback } from 'react';
import { PipelineTableSkeleton } from '@/components/features/pipeline/shared/pipeline-skeletons';
import { useQueryArchivedApplications } from '@/hooks/queries/use-query-kanban';
import { useDecryptCandidateNames } from '@/hooks/use-decrypt-candidate-names';
import type { ArchivedApplication } from '@/lib/schemas/pipeline';
import { formatDate, getCandidateDisplayName } from '@/lib/utils';

interface ArchivedSectionProps {
  jobId: string;
  orgId: string;
  onCandidateClick: (applicationId: string) => void;
}

interface ArchivedApplicationRowProps {
  app: ArchivedApplication;
  candidateName: string;
  onCandidateClick: (applicationId: string) => void;
}

const ArchivedApplicationRow = memo(function ArchivedApplicationRow({
  app,
  candidateName,
  onCandidateClick,
}: ArchivedApplicationRowProps) {
  const handleClick = useCallback(() => {
    onCandidateClick(app.id);
  }, [app.id, onCandidateClick]);

  return (
    <TableRow>
      <TableCell>
        <button type="button" className="font-medium hover:underline" onClick={handleClick}>
          {candidateName}
        </button>
        {app.duplicateAttemptCount > 0 && (
          <p className="text-xs text-muted-foreground">{app.duplicateAttemptCount + 1} application attempts</p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{APPLICATION_TERMINAL_OUTCOME_LABEL[app.terminalOutcome]}</TableCell>
      <TableCell className="text-muted-foreground">{app.archiveReasonLabel ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{app.archivedAtStageName ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(app.terminalOutcomeAt)}</TableCell>
    </TableRow>
  );
});

export function ArchivedSection({ jobId, orgId, onCandidateClick }: ArchivedSectionProps) {
  const { archived, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useQueryArchivedApplications(jobId);
  const namesMap = useDecryptCandidateNames(archived, orgId);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);
  const loadMoreRef = useInfiniteScrollSentinel({
    hasMore: Boolean(hasNextPage),
    isLoading: isFetchingNextPage,
    disabled: isFetchNextPageError,
    onLoadMore: handleLoadMore,
  });

  if (isLoading) {
    return <PipelineTableSkeleton activeTab="archived" className="h-full p-4" rows={5} scope="job" />;
  }

  if (archived.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">No closed applications</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Card size="sm" className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Candidate</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archived.map((app) => {
                const candidateName = getCandidateDisplayName({
                  applicationId: app.id,
                  candidateId: app.candidateId,
                  profile: namesMap.get(app.candidateId ?? '') ?? null,
                });

                return (
                  <ArchivedApplicationRow
                    key={app.id}
                    app={app}
                    candidateName={candidateName}
                    onCandidateClick={onCandidateClick}
                  />
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
        {isFetchingNextPage && <PipelineTableSkeleton activeTab="archived" rows={3} scope="job" />}
        {isFetchNextPageError && (
          <div className="flex items-center justify-center gap-2 py-3 text-center text-xs text-destructive">
            <span>Could not load more closed applications.</span>
            <Button type="button" variant="outline" size="xs" onClick={handleLoadMore}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
