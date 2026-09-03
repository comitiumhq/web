import type { TipTapDoc } from '@comitium/schemas/common';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { Skeleton } from '@comitium/ui/skeleton';
import { LockIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import { cn, formatRelativeTime, getActorDisplayName, getNameInitials } from '@/lib/utils';

interface NoteCardProps {
  noteId: string;
  authorName: string | null;
  isPrivate: boolean;
  createdAt: string;
  orgId: string;
  decryptedContent?: TipTapDoc;
  isDecrypting?: boolean;
  decryptionError?: boolean;
  isOwnNote?: boolean;
  onDelete?: (noteId: string) => void;
  isDeleting?: boolean;
}

export const NoteCard = memo(function NoteCard({
  noteId,
  authorName,
  isPrivate,
  createdAt,
  orgId,
  decryptedContent,
  isDecrypting = false,
  decryptionError = false,
  isOwnNote,
  onDelete,
  isDeleting,
}: NoteCardProps) {
  const actorName = getActorDisplayName(authorName);
  const initials = getNameInitials(authorName);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDeleteRequest = useCallback(() => setConfirmDeleteOpen(true), []);

  const handleDeleteConfirm = useCallback(() => {
    if (onDelete) {
      onDelete(noteId);
    }

    setConfirmDeleteOpen(false);
  }, [onDelete, noteId]);

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div
          className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium', {
            'bg-muted text-muted-foreground': !isPrivate,
            'bg-secondary text-secondary-foreground': isPrivate,
          })}
        >
          {initials}
        </div>

        <span className="text-label-13 font-medium flex-1 truncate">{actorName}</span>

        {isPrivate && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 gap-0.5">
            <LockIcon />
            Private
          </Badge>
        )}

        <span className="text-label-12 text-muted-foreground shrink-0">{formatRelativeTime(createdAt)}</span>

        {isOwnNote && onDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleDeleteRequest}
            disabled={isDeleting}
            aria-label="Delete note"
          >
            <XIcon />
          </Button>
        )}
      </div>

      <div className="px-4 pb-4">
        <NoteBody
          orgId={orgId}
          decryptedContent={decryptedContent}
          isDecrypting={isDecrypting}
          decryptionError={decryptionError}
        />
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete note?"
        description="This note will be permanently removed from the candidate's activity feed."
        actionLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </Card>
  );
});

interface NoteBodyProps {
  orgId: string;
  decryptedContent?: TipTapDoc;
  isDecrypting: boolean;
  decryptionError: boolean;
}

function NoteBody({ orgId, decryptedContent, isDecrypting, decryptionError }: NoteBodyProps) {
  if (decryptedContent) {
    return (
      <div className="text-copy-13">
        <RichTextEditor content={decryptedContent} readOnly />
      </div>
    );
  }

  if (isDecrypting) {
    return <NoteBodySkeleton />;
  }

  if (decryptionError) {
    return <p className="py-1 text-label-12 text-muted-foreground">Note could not be decrypted.</p>;
  }

  return <EncryptedPlaceholder orgId={orgId} variant="block" withBorder={false} lines={2} />;
}

function NoteBodySkeleton() {
  return (
    <div aria-hidden className="py-1">
      <Skeleton className="h-3 w-full rounded-md" />
      <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <Card aria-hidden size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="ml-auto h-3 w-14 rounded-md" />
      </div>
      <div className="px-4 pb-4">
        <NoteBodySkeleton />
      </div>
    </Card>
  );
}
