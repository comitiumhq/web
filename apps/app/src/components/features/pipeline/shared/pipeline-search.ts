import { type CandidateProfile, formatCandidateName } from '@comitium/schemas/candidates';
import type { PipelineCandidate, PipelineJob } from '@/lib/schemas/pipeline';

export type PipelineCandidateSearchScope = 'global' | 'job';

export function filterPipelineJobs(jobs: PipelineJob[], query: string): PipelineJob[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return jobs;
  }

  return jobs.filter((job) => includesSearchQuery(job.title, normalizedQuery));
}

export function filterPipelineCandidates(
  candidates: PipelineCandidate[],
  namesMap: Map<string, CandidateProfile>,
  query: string,
  scope: PipelineCandidateSearchScope,
): PipelineCandidate[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const profile = namesMap.get(candidate.candidateId ?? '') ?? null;
    const searchableValues = [
      formatCandidateName(profile),
      profile?.email,
      profile?.currentTitle,
      profile?.currentCompany,
      profile?.location,
      scope === 'global' ? candidate.jobTitle : null,
    ];

    return searchableValues.some((value) => includesSearchQuery(value, normalizedQuery));
  });
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function includesSearchQuery(value: string | null | undefined, normalizedQuery: string): boolean {
  return value?.toLocaleLowerCase().includes(normalizedQuery) ?? false;
}
