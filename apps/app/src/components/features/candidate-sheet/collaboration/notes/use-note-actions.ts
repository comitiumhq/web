import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useDeleteNote } from '@/hooks/mutations/use-delete-note';

export function useNoteActions(candidateId: string | null) {
  const { mutate: deleteNote } = useDeleteNote();
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      if (!candidateId) {
        return;
      }

      setDeletingNoteId(noteId);

      deleteNote(
        { candidateId, noteId },
        {
          onSuccess: () => {
            toast.success('Note deleted');
            setDeletingNoteId(null);
          },
          onError: () => {
            toast.error('Failed to delete note');
            setDeletingNoteId(null);
          },
        },
      );
    },
    [candidateId, deleteNote],
  );

  return { handleDeleteNote, deletingNoteId };
}
