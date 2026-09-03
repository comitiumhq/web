import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { deleteNote } from '@/lib/api/candidates';

interface DeleteNoteInput {
  candidateId: string;
  noteId: string;
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteNoteInput) => deleteNote(input.candidateId, input.noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
      queryClient.invalidateQueries({ queryKey: qk.application.candidateNotes(variables.candidateId) });
    },
  });
}
