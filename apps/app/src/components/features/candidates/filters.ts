import type { ApplicationSearchPredicate, CandidateSearchDefinition } from '@comitium/schemas/candidate-search';

export interface Choice {
  id: string;
  label: string;
}

export type ChoiceField = 'job' | 'department' | 'source' | 'stage' | 'outcome' | 'tags' | 'skills';
export type CandidateFilter =
  | { field: ChoiceField; choices: Choice[] }
  | { field: 'location'; cityId: number; label: string };
export type FilterField = CandidateFilter['field'];

export const MAX_FILTER_CHOICES = 20;

export const FILTER_LABELS: Record<FilterField, string> = {
  job: 'Job',
  department: 'Department',
  source: 'Candidate source',
  stage: 'Current stage',
  outcome: 'Outcome',
  location: 'Location',
  tags: 'Tags',
  skills: 'Skills',
};

export const OUTCOMES = [
  { id: 'active', label: 'Active' },
  { id: 'hired', label: 'Hired' },
  { id: 'archived', label: 'Archived' },
  { id: 'imported_unknown', label: 'Imported · outcome unknown' },
] as const;

export function applyCandidateFilter(filters: CandidateFilter[], next: CandidateFilter): CandidateFilter[] {
  const previousJob = filters.find((filter) => filter.field === 'job');

  const sameJob =
    next.field === 'job' &&
    previousJob &&
    'choices' in previousJob &&
    previousJob.choices.length === next.choices.length &&
    previousJob.choices.every((choice) => next.choices.some((value) => value.id === choice.id));

  const remaining = filters.filter(
    (filter) => filter.field !== next.field && !(next.field === 'job' && !sameJob && filter.field === 'stage'),
  );

  if ('choices' in next && next.choices.length === 0) {
    return remaining;
  }

  return [...remaining, next];
}

export function removeCandidateFilter(filters: CandidateFilter[], field: FilterField): CandidateFilter[] {
  return filters.filter((filter) => filter.field !== field && !(field === 'job' && filter.field === 'stage'));
}

export function candidateDefinition(filters: CandidateFilter[], name: string): CandidateSearchDefinition {
  const candidateAll: CandidateSearchDefinition['candidateAll'] = [];
  const all: ApplicationSearchPredicate[] = [];

  if (name.trim()) {
    candidateAll.push({ field: 'candidate.profileText', op: 'allTerms', value: name });
  }

  for (const filter of filters) {
    if (filter.field === 'location') {
      candidateAll.push({ field: 'candidate.cityId', op: 'in', value: [filter.cityId] });
      continue;
    }

    const value = filter.choices.map((choice) => choice.id);
    switch (filter.field) {
      case 'job':
        all.push({ field: 'application.jobId', op: 'in', value });
        break;
      case 'department':
        all.push({ field: 'application.departmentId', op: 'in', value });
        break;
      case 'stage':
        all.push({ field: 'application.stageId', op: 'in', value });
        break;
      case 'skills':
        all.push({ field: 'application.skillIds', op: 'containsAll', value });
        break;
      case 'tags':
        candidateAll.push({ field: 'candidate.tags', op: 'containsAll', value });
        break;
      case 'source':
        candidateAll.push({ field: 'candidate.sourceId', op: 'in', value });
        break;
      case 'outcome':
        all.push({
          field: 'application.outcome',
          op: 'in',
          value: OUTCOMES.filter((outcome) => value.includes(outcome.id)).map((outcome) => outcome.id),
        });

        break;
    }
  }

  return {
    subject: 'candidate',
    version: 1,
    candidateAll,
    ...(all.length ? { applicationAny: { all } } : {}),
    sort: 'first_seen_desc',
  };
}
