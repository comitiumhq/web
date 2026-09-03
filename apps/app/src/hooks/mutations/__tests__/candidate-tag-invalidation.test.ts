import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { qk } from '@/hooks/query-keys';

import { invalidateCandidateTagSurfaces } from '../use-candidate-tag';

interface InvalidateCall {
  queryKey?: readonly unknown[];
  predicate?: (query: { queryKey: readonly unknown[] }) => boolean;
}

describe('invalidateCandidateTagSurfaces', () => {
  it('keeps all surfaces that inline candidate tag ids under qk-owned topology', () => {
    const calls: InvalidateCall[] = [];
    const queryClient = {
      invalidateQueries: (options: InvalidateCall) => {
        calls.push(options);
      },
    } as unknown as QueryClient;

    invalidateCandidateTagSurfaces(queryClient);

    expect(calls[0]?.queryKey).toEqual(qk.pipeline.candidatesRoot());
    expect(calls[1]?.queryKey).toEqual(qk.application.root());
    expect(calls[2]?.queryKey).toEqual(qk.candidate.activityRoot());
    expect(calls[3]?.predicate?.({ queryKey: qk.jobs.kanbanRoot('job-1') })).toBe(true);
    expect(calls[3]?.predicate?.({ queryKey: qk.jobs.orgRoot('org-1') })).toBe(false);
  });
});
