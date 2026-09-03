import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { TipTapDoc, WrappedKey } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { BROWSER_TZ } from '@comitium/ui/date';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { Skeleton } from '@comitium/ui/skeleton';
import { useCallback, useMemo } from 'react';
import { useQueryCandidateActivity } from '@/hooks/queries/use-query-candidate-activity';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { useQueryOrgMe } from '@/hooks/use-permissions';

import { FeedEventCard } from './feed-event-card';
import { useDecryptedActivityEmails } from './use-decrypted-activity-emails';

interface FeedTabProps {
  applicationId: string | null;
  candidateId: string | null;
  orgId: string;
  candidateProfile: CandidateProfile | null;
  wrappedVaultKey: WrappedKey | undefined;
  isVaultKeyLoading: boolean;
  isVaultKeyError: boolean;
  decryptedNotes: Record<string, TipTapDoc>;
  decryptingNoteIds: ReadonlySet<string>;
  failedNoteIds: ReadonlySet<string>;
  currentUserId: string;
  canManageNotes: boolean;
  onDeleteNote: (noteId: string) => void;
  deletingNoteId: string | null;
}

export function FeedTab({
  applicationId,
  candidateId,
  orgId,
  candidateProfile,
  wrappedVaultKey,
  isVaultKeyLoading,
  isVaultKeyError,
  decryptedNotes,
  decryptingNoteIds,
  failedNoteIds,
  currentUserId,
  canManageNotes,
  onDeleteNote,
  deletingNoteId,
}: FeedTabProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);
  const { data: orgMember } = useQueryOrgMe(orgId);
  const {
    data: activityData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useQueryCandidateActivity(candidateId, applicationId);

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const activityEvents = useMemo(() => activityData?.data ?? [], [activityData?.data]);
  const { decryptedEmails, decryptingEmailIds, failedEmailIds } = useDecryptedActivityEmails(
    candidateId,
    orgId,
    activityEvents,
    wrappedVaultKey,
  );
  const isInitialLoading = isLoading && !activityData;
  const isInitialError = isError && !activityData;
  const timeZone = orgMember?.timezone ?? BROWSER_TZ;

  return (
    <div className="flex-1 overflow-y-auto min-h-0 h-full">
      <div className="flex flex-col gap-3 px-4 pb-4 pt-20">
        {isInitialLoading && <FeedSkeleton />}

        {!candidateId && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Candidate activity is available once the profile is ready.
          </p>
        )}

        {candidateId && isInitialError && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Activity could not be loaded.</p>
            <Button type="button" variant="outline" size="xs" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        )}

        {!isInitialError &&
          activityEvents.map((event) => {
            const decryptedEmail = event.payload.kind === 'email' ? decryptedEmails[event.payload.emailId] : undefined;
            const decryptedNoteContent =
              event.payload.kind === 'note' ? decryptedNotes[event.payload.noteId] : undefined;
            const deletingNoteMatches = event.payload.kind === 'note' && deletingNoteId === event.payload.noteId;
            const isDecryptingEmail =
              event.payload.kind === 'email' &&
              isUnlocked &&
              (isVaultKeyLoading || decryptingEmailIds.has(event.payload.emailId));
            const emailDecryptionError =
              event.payload.kind === 'email' &&
              isUnlocked &&
              (isVaultKeyError || failedEmailIds.has(event.payload.emailId));
            const isDecryptingNote =
              event.payload.kind === 'note' &&
              isUnlocked &&
              (isVaultKeyLoading || decryptingNoteIds.has(event.payload.noteId));
            const noteDecryptionError =
              event.payload.kind === 'note' &&
              isUnlocked &&
              (isVaultKeyError || failedNoteIds.has(event.payload.noteId));

            return (
              <FeedEventCard
                key={event.id}
                event={event}
                selectedApplicationId={applicationId}
                orgId={orgId}
                candidateProfile={candidateProfile}
                decryptedEmail={decryptedEmail}
                decryptedNoteContent={decryptedNoteContent}
                isDecryptingEmail={isDecryptingEmail}
                emailDecryptionError={emailDecryptionError}
                isDecryptingNote={isDecryptingNote}
                noteDecryptionError={noteDecryptionError}
                currentUserId={currentUserId}
                timeZone={timeZone}
                onDeleteNote={canManageNotes ? onDeleteNote : undefined}
                isDeleting={deletingNoteMatches}
              />
            );
          })}

        {candidateId && activityEvents.length === 0 && !isInitialLoading && !isInitialError && (
          <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
        )}
        {!isInitialError && (
          <InfiniteCollectionStatus
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            loadingLabel="Loading activity..."
            errorLabel="Could not load more activity."
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3 py-1">
      <span className="sr-only">Loading activity</span>
      <TimelineRowSkeleton />
      <MessageCardSkeleton />
      <TimelineRowSkeleton compact />
    </div>
  );
}

function TimelineRowSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden className="flex items-start gap-2.5 px-1 py-2">
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className={compact ? 'h-3.5 w-2/5 rounded-md' : 'h-3.5 w-3/5 rounded-md'} />
        {!compact && <Skeleton className="mt-2 h-3 w-2/5 rounded-md" />}
      </div>
      <Skeleton className="h-3 w-14 shrink-0 rounded-md" />
    </div>
  );
}

function MessageCardSkeleton() {
  return (
    <Card aria-hidden size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="mt-2 h-3 w-40 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-3 w-14 shrink-0 rounded-md" />
      </div>
      <div className="px-4 py-3">
        <Skeleton className="h-3.5 w-2/5 rounded-md" />
        <Skeleton className="mt-3 h-3 w-full rounded-md" />
        <Skeleton className="mt-2 h-3 w-4/5 rounded-md" />
      </div>
    </Card>
  );
}
