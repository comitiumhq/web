import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { projectCandidateCustomFieldValue } from '@/lib/api/candidate-custom-field-values';
import type { ProjectCandidateCustomFieldValueBody } from '@/lib/schemas/candidate-custom-field-values';

interface ProjectValueParams {
  candidateId: string;
  body: ProjectCandidateCustomFieldValueBody;
}

export function useProjectCandidateCustomFieldValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, body }: ProjectValueParams) => projectCandidateCustomFieldValue(candidateId, body),
    onSuccess: (result, { candidateId }) => {
      if (result.applied) {
        queryClient.invalidateQueries({ queryKey: qk.application.candidateCustomFieldValues(candidateId) });
      }
    },
  });
}
