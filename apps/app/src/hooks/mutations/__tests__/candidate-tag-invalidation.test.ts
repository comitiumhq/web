import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, onTestFinished } from 'vitest';

import { qk } from '@/hooks/query-keys';

import { invalidateCandidateTagSurfaces } from '../use-candidate-tag';

describe('invalidateCandidateTagSurfaces', () => {
  it('invalidates candidate tag surfaces without invalidating the job directory', () => {
    const queryClient = new QueryClient();
    onTestFinished(() => queryClient.clear());
    const affected = [
      qk.pipeline.candidates('org-1', {}),
      qk.application.detail('application-1'),
      qk.candidate.activity('candidate-1', 'application-1'),
      qk.jobs.kanban('job-1', {}),
      qk.candidate.directory('org-1', 'request-1'),
    ];
    const unaffected = qk.jobs.org('org-1', {});

    for (const queryKey of [...affected, unaffected]) {
      queryClient.setQueryData(queryKey, 'cached');
    }

    invalidateCandidateTagSurfaces(queryClient);

    for (const queryKey of affected) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    }

    expect(queryClient.getQueryState(unaffected)?.isInvalidated).toBe(false);
  });
});
