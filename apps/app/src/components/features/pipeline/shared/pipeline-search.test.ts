import type { CandidateProfile } from '@comitium/schemas/candidates';
import { describe, expect, it } from 'vitest';
import type { PipelineCandidate, PipelineJob } from '@/lib/schemas/pipeline';

import { filterPipelineCandidates, filterPipelineJobs } from './pipeline-search';

const PROFILE: CandidateProfile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  linkedIn: null,
  github: null,
  website: null,
  location: 'London',
  currentTitle: 'Staff Engineer',
  currentCompany: 'Analytical Engines',
};

const CANDIDATE = createCandidate();

describe('pipeline search', () => {
  it('returns the original collections for a blank query', () => {
    const jobs = [createJob()];
    const candidates = [CANDIDATE];

    expect(filterPipelineJobs(jobs, '  ')).toBe(jobs);
    expect(filterPipelineCandidates(candidates, new Map(), '  ', 'global')).toBe(candidates);
  });

  it('matches loaded jobs by title without case sensitivity', () => {
    const matchingJob = createJob({ title: 'Platform Engineer' });
    const otherJob = createJob({ id: 'job-2', title: 'Product Designer' });

    expect(filterPipelineJobs([matchingJob, otherJob], ' platform ')).toEqual([matchingJob]);
  });

  it.each(['ada lovelace', 'ADA@EXAMPLE.COM', 'staff engineer', 'analytical', 'london'])(
    'matches decrypted candidate field %s',
    (query) => {
      const namesMap = new Map([[CANDIDATE.candidateId ?? '', PROFILE]]);

      expect(filterPipelineCandidates([CANDIDATE], namesMap, query, 'job')).toEqual([CANDIDATE]);
    },
  );

  it('matches the job title only in the global candidate view', () => {
    expect(filterPipelineCandidates([CANDIDATE], new Map(), 'protocol', 'global')).toEqual([CANDIDATE]);
    expect(filterPipelineCandidates([CANDIDATE], new Map(), 'protocol', 'job')).toEqual([]);
  });

  it('does not treat internal candidate identifiers as searchable profile data', () => {
    expect(filterPipelineCandidates([CANDIDATE], new Map(), 'candidate-', 'job')).toEqual([]);
  });
});

function createJob(overrides: Partial<PipelineJob> = {}): PipelineJob {
  return {
    id: 'job-1',
    jobId: 1,
    status: 'open',
    lifecycle: {
      transition: null,
      commitmentFinalizationPending: false,
      activeApplications: 1,
      allowedActions: [],
    },
    title: 'Protocol Engineer',
    location: null,
    totalCandidates: 1,
    stages: [],
    ...overrides,
  };
}

function createCandidate(overrides: Partial<PipelineCandidate> = {}): PipelineCandidate {
  return {
    id: 'application-1',
    candidateId: 'candidate-1',
    candidateProfile: null,
    jobId: 'job-1',
    jobOnChainId: 1,
    jobTitle: 'Protocol Engineer',
    appliedAt: '2026-08-20T12:00:00.000Z',
    responseDeadline: null,
    isResponded: false,
    terminalOutcome: null,
    terminalOutcomeAt: null,
    currentStageId: 'stage-1',
    currentStageName: 'Application review',
    currentStageEnteredAt: '2026-08-20T12:00:00.000Z',
    interviewStatus: null,
    interviewScheduledAt: null,
    stageType: 'review',
    archivedAt: null,
    archivedAtStageName: null,
    archiveReasonId: null,
    archiveReasonLabel: null,
    archiveReasonType: null,
    searchProjection: null,
    criterionSummary: null,
    updatedAt: null,
    tagIds: [],
    reviewStatus: {
      totalReviewers: 0,
      submittedReviewers: 0,
      currentUserHasPendingReview: false,
      currentUserHasSubmittedReview: false,
      needsDecision: false,
    },
    duplicateAttemptCount: 0,
    ...overrides,
  };
}
