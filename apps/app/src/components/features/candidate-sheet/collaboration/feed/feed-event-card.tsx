import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { TipTapDoc } from '@comitium/schemas/common';
import { memo } from 'react';
import type { ActivityFeedRow, DecryptedEmail, EmailPayload, NotePayload } from '@/lib/schemas/emails';

import { TimelineEventRow } from '../../progress/activity-event';
import { NoteCard } from '../notes/note-card';

import { EmailFeedCard } from './email-feed-card';

interface FeedEventCardProps {
  event: ActivityFeedRow;
  selectedApplicationId: string | null;
  orgId: string;
  candidateProfile: CandidateProfile | null;
  decryptedEmail?: DecryptedEmail;
  decryptedNoteContent?: TipTapDoc;
  isDecryptingEmail: boolean;
  emailDecryptionError: boolean;
  isDecryptingNote: boolean;
  noteDecryptionError: boolean;
  currentUserId: string;
  timeZone: string;
  onDeleteNote?: (noteId: string) => void;
  isDeleting: boolean;
}

export const FeedEventCard = memo(function FeedEventCard({
  event,
  selectedApplicationId,
  orgId,
  candidateProfile,
  decryptedEmail,
  decryptedNoteContent,
  isDecryptingEmail,
  emailDecryptionError,
  isDecryptingNote,
  noteDecryptionError,
  currentUserId,
  timeZone,
  onDeleteNote,
  isDeleting,
}: FeedEventCardProps) {
  switch (event.payload.kind) {
    case 'email':
      return (
        <EmailFeedCard
          event={event as ActivityFeedRow & { payload: EmailPayload }}
          selectedApplicationId={selectedApplicationId}
          orgId={orgId}
          decryptedEmail={decryptedEmail}
          isDecrypting={isDecryptingEmail}
          decryptionError={emailDecryptionError}
          candidateProfile={candidateProfile}
        />
      );
    case 'note': {
      const isOwnNote = event.actor.userId === currentUserId;

      return (
        <NoteCard
          noteId={(event.payload as NotePayload).noteId}
          authorName={event.actor.name}
          isPrivate={(event.payload as NotePayload).isPrivate}
          createdAt={event.createdAt}
          orgId={orgId}
          decryptedContent={decryptedNoteContent}
          isDecrypting={isDecryptingNote}
          decryptionError={noteDecryptionError}
          isOwnNote={isOwnNote}
          onDelete={onDeleteNote && isOwnNote ? onDeleteNote : undefined}
          isDeleting={isDeleting}
        />
      );
    }
    default:
      return <TimelineEventRow event={event} selectedApplicationId={selectedApplicationId} timeZone={timeZone} />;
  }
});
