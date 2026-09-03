import type { EncryptedEnvelope } from '@comitium/schemas/common';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { createNote } from '@/lib/api/candidates';

interface CreateNoteInput {
  candidateId: string;
  content: EncryptedEnvelope;
  mentions: string[];
  isPrivate: boolean;
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) =>
      createNote(input.candidateId, input.content, input.mentions, input.isPrivate),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });
      queryClient.invalidateQueries({ queryKey: qk.application.candidateNotes(variables.candidateId) });
    },
  });
}
