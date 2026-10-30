import { candidateSearchDefinitionSchema, serverCandidateQuerySchema } from '@comitium/schemas/candidate-search';
import { describe, expect, it } from 'vitest';
import {
  applyCandidateFilter,
  candidateDefinition,
  removeCandidateFilter,
} from '@/components/features/candidates/filters';
import { compileCandidateSearch } from './query-definition';

const jobId = '00000000-0000-4000-8000-000000000001';
const skillId = '00000000-0000-4000-8000-000000000002';

describe('Candidate query privacy boundary', () => {
  it('reapplying an unchanged Job preserves its Stage condition', () => {
    const job = { field: 'job' as const, choices: [{ id: jobId, label: 'Engineer' }] };
    const stage = { field: 'stage' as const, choices: [{ id: skillId, label: 'Interview' }] };

    expect(applyCandidateFilter([job, stage], job)).toContainEqual(stage);
  });

  it('clearing the last Job selection removes its dependent Stage and creates no empty predicate', () => {
    const job = { field: 'job' as const, choices: [{ id: jobId, label: 'Engineer' }] };
    const stage = { field: 'stage' as const, choices: [{ id: skillId, label: 'Interview' }] };
    const filters = [job, stage];
    const cleared = applyCandidateFilter(filters, { field: 'job', choices: [] });

    expect(cleared).toEqual([]);
    expect(removeCandidateFilter(filters, 'job')).toEqual([]);
    expect(candidateSearchDefinitionSchema.safeParse(candidateDefinition(cleared, '')).success).toBe(true);
  });

  it('keeps name/contact and location values outside the wire while combining Resume and same-Application predicates', () => {
    const definition = candidateDefinition(
      [
        { field: 'job', choices: [{ id: jobId, label: 'Engineer' }] },
        { field: 'skills', choices: [{ id: skillId, label: 'TypeScript' }] },
        { field: 'location', cityId: 123, label: 'Private place' },
      ],
      'private.person@example.test',
      'backend in payments',
    );

    const { server, privateFilter } = compileCandidateSearch(definition);
    const wire = JSON.stringify(server);

    expect(wire).not.toContain('private.person');
    expect(wire).not.toContain('Private place');
    expect(wire).not.toContain('123');
    expect(privateFilter).toEqual({ profileText: 'private.person@example.test', cityIds: [123] });
    expect(server.retrieval).toEqual({ kind: 'semantic', query: 'backend in payments' });
    expect(server.applicationAny?.all).toHaveLength(2);
    expect(serverCandidateQuerySchema.safeParse(server).success).toBe(true);
  });

  it('rejects injecting private predicates into the API payload and ambiguous duplicate private conditions', () => {
    const definition = candidateDefinition([], 'Private Person');

    expect(
      serverCandidateQuerySchema.safeParse({
        ...compileCandidateSearch(definition).server,
        candidateAll: definition.candidateAll,
      }).success,
    ).toBe(false);

    expect(
      candidateSearchDefinitionSchema.safeParse({
        ...definition,
        candidateAll: [...definition.candidateAll, ...definition.candidateAll],
      }).success,
    ).toBe(false);
  });

  it('changing Job removes the old stage and preserves independent name/Resume inputs', () => {
    const filters = applyCandidateFilter([{ field: 'stage', choices: [{ id: skillId, label: 'Interview' }] }], {
      field: 'job',
      choices: [{ id: jobId, label: 'Engineer' }],
    });

    const definition = candidateDefinition(filters, 'Ada', 'payments');

    expect(definition.applicationAny?.all.map((predicate) => predicate.field)).toEqual(['application.jobId']);
    expect(definition.retrieval?.query).toBe('payments');
    expect(definition.candidateAll[0]).toEqual({ field: 'candidate.profileText', op: 'allTerms', value: 'Ada' });
  });
});
