import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { ScrollArea } from '@comitium/ui/scroll-area';
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
    <tr className="border-b border-border last:border-b-0 hover:bg-muted">
      <td className="p-3">
        <button type="button" className="font-medium hover:underline" onClick={handleClick}>
          {candidateName}
        </button>
        {app.duplicateAttemptCount > 0 && (
          <p className="text-xs text-muted-foreground">{app.duplicateAttemptCount + 1} application attempts</p>
        )}
      </td>
      <td className="p-3 text-muted-foreground">{APPLICATION_TERMINAL_OUTCOME_LABEL[app.terminalOutcome]}</td>
      <td className="p-3 text-muted-foreground">{app.archiveReasonLabel ?? '—'}</td>
      <td className="p-3 text-muted-foreground">{app.archivedAtStageName ?? '—'}</td>
      <td className="p-3 text-muted-foreground">{formatDate(app.terminalOutcomeAt)}</td>
    </tr>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="p-3 text-left font-medium text-muted-foreground">Candidate</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Decision</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Reason</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Stage</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Closed</th>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
          </table>
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
