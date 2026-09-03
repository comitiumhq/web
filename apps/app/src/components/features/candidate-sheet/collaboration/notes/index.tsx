import type { PublicEncryptionKey } from '@comitium/crypto';
import type { CandidateNote } from '@comitium/schemas/candidates';
import type { TipTapDoc } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';

import { NoteCard, NoteCardSkeleton } from './note-card';
import { NoteForm } from './note-form';

interface NotesTabProps {
  orgId: string;
  candidateId: string | null;
  currentUserId: string;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  canManageNotes: boolean;
  decryptedNotes: Record<string, TipTapDoc>;
  notes: CandidateNote[];
  totalNotes: number;
  isLoading: boolean;
  isError: boolean;
  decryptingNoteIds: ReadonlySet<string>;
  failedNoteIds: ReadonlySet<string>;
  isVaultKeyError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onDeleteNote: (noteId: string) => void;
  deletingNoteId: string | null;
}

export function NotesTab({
  orgId,
  candidateId,
  currentUserId,
  vaultPublicKey,
  vaultKeyVersion,
  canManageNotes,
  decryptedNotes,
  notes,
  totalNotes,
  isLoading,
  isError,
  decryptingNoteIds,
  failedNoteIds,
  isVaultKeyError,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onLoadMore,
  onRetry,
  onDeleteNote,
  deletingNoteId,
}: NotesTabProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);
  const memberMap = useQueryOrgTeamMap(orgId);
  const isInitialLoading = isLoading && notes.length === 0;
  const isInitialError = isError && notes.length === 0;

  if (!isUnlocked) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0 h-full">
        <div className="px-4 pb-4 pt-20">
          <EncryptedPlaceholder orgId={orgId} variant="block" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-3 px-4 pb-4 pt-20">
        {canManageNotes && candidateId && vaultPublicKey && (
          <div className="border-b pb-3">
            <NoteForm
              orgId={orgId}
              candidateId={candidateId}
              vaultPublicKey={vaultPublicKey}
              vaultKeyVersion={vaultKeyVersion}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isInitialLoading && <NotesSkeleton />}

          {!isInitialLoading && isInitialError && (
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Notes could not be loaded.</p>
              <Button type="button" variant="outline" size="xs" onClick={onRetry}>
                Try again
              </Button>
            </div>
          )}

          {!isInitialError &&
            notes.map((note) => {
              const isOwnNote = note.author === currentUserId;

              return (
                <NoteCard
                  key={note.id}
                  noteId={note.id}
                  authorName={memberMap.get(note.author)?.name ?? null}
                  isPrivate={note.isPrivate}
                  createdAt={note.createdAt}
                  orgId={orgId}
                  decryptedContent={decryptedNotes[note.id]}
                  isDecrypting={decryptingNoteIds.has(note.id)}
                  decryptionError={isVaultKeyError || failedNoteIds.has(note.id)}
                  isOwnNote={isOwnNote}
                  onDelete={canManageNotes && isOwnNote ? onDeleteNote : undefined}
                  isDeleting={deletingNoteId === note.id}
                />
              );
            })}

          {!isInitialLoading && !isInitialError && notes.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No notes yet</p>
          )}
          {!isInitialError && (
            <InfiniteCollectionStatus
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isFetchNextPageError={isFetchNextPageError}
              loadingLabel={`Loading notes (${notes.length} of ${totalNotes})...`}
              errorLabel="Could not load more notes."
              onLoadMore={onLoadMore}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3 py-1">
      <span className="sr-only">Loading notes</span>
      <NoteCardSkeleton />
      <NoteCardSkeleton />
    </div>
  );
}
