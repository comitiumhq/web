import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';
import { buildConsiderations, getMergedConsiderationTotal } from '../use-consideration-selection';

function makeApplication(overrides: Partial<ApplicationApiResponse> = {}): ApplicationApiResponse {
  return {
    id: 'app-current',
    jobId: 'job-current-from-api',
    candidateId: 'candidate-1',
    searchProjection: null,
    processing: null,
    criterionSummary: null,
    criterionAssessments: [],
    appliedAt: '2026-01-02T00:00:00.000Z',
    responseDeadline: null,
    currentStageId: 'stage-current',
    currentStageEnteredAt: '2026-01-02T00:00:00.000Z',
    interviewStatus: null,
    interviewScheduledAt: null,
    reviewStatus: {
      totalReviewers: 0,
      submittedReviewers: 0,
      currentUserHasPendingReview: false,
      currentUserHasSubmittedReview: false,
      needsDecision: false,
    },
    terminalOutcome: null,
    terminalOutcomeAt: null,
    archivedAt: null,
    archivedAtStageId: null,
    archiveReasonId: null,
    archiveReasonLabel: null,
    archiveReasonType: null,
    isResponded: false,
    respondedAt: null,
    hasResume: false,
    resumeFileId: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tagIds: [],
    duplicateAttemptCount: 0,
    duplicateOfApplicationId: null,
    considerationContext: {
      job: { id: 'job-current-from-api', title: 'Current role', status: 'open' },
      stage: {
        id: 'stage-current',
        name: 'Interview',
        enteredAt: '2026-01-02T00:00:00.000Z',
      },
      attribution: {
        origin: 'public_apply',
        sourceId: null,
        sourceName: null,
        creditedTo: null,
      },
      hiringTeam: [],
      lineage: {
        rootApplicationId: 'app-current',
        currentApplicationId: 'app-current',
        applicationIds: ['app-current'],
      },
      capabilities: {
        candidate: {
          canEditProfile: true,
          canManageFiles: true,
          canManageTags: true,
          canCreateNote: true,
          canViewPrivateData: false,
          canConsiderForJob: true,
        },
        consideration: {
          canMoveStage: true,
          canMarkHired: true,
          canArchive: true,
          canReopen: false,
          canTransfer: true,
          canSchedule: true,
          canSendEmail: false,
          canSubmitFeedback: true,
          canModerateFeedback: false,
        },
      },
      actionState: {
        status: 'no_action',
        blockedReason: null,
        nextAction: null,
      },
      currentActivities: [],
    },
    ...overrides,
  };
}

const otherApplications = [
  {
    id: 'app-old',
    jobId: 'job-old',
    jobOnChainId: 10,
    jobTitle: 'Old role',
    appliedAt: '2026-01-01T00:00:00.000Z',
    currentStageId: 'stage-old',
    terminalOutcome: null,
    terminalOutcomeAt: null,
    currentStageName: 'Review',
    isResponded: true,
    archivedAt: null,
    duplicateAttemptCount: 0,
  },
  {
    id: 'app-new',
    jobId: 'job-new',
    jobOnChainId: 11,
    jobTitle: 'New role',
    appliedAt: '2026-01-03T00:00:00.000Z',
    currentStageId: 'stage-new',
    terminalOutcome: null,
    terminalOutcomeAt: null,
    currentStageName: 'Offer',
    isResponded: false,
    archivedAt: null,
    duplicateAttemptCount: 0,
  },
];

describe('buildConsiderations', () => {
  it('returns the ordinary navigation shape in effective date order', () => {
    const applications = buildConsiderations({
      application: makeApplication(),
      otherApplications,
      jobId: 'job-current',
      jobOnChainId: 12,
      jobTitle: 'Current role',
      currentStageName: 'Interview',
    });

    expect(applications.map((app) => app.id)).toEqual(['app-new', 'app-current', 'app-old']);
    expect(applications).toHaveLength(3);
    expect(applications[1]).toMatchObject({
      id: 'app-current',
      jobId: 'job-current',
      jobOnChainId: 12,
      jobTitle: 'Current role',
      currentStageName: 'Interview',
    });
  });

  it('keeps one selected application when a cached page contains the same resolved destination', () => {
    const applications = buildConsiderations({
      application: makeApplication(),
      otherApplications: [
        ...otherApplications,
        {
          id: 'app-current',
          jobId: 'job-stale',
          jobOnChainId: 99,
          jobTitle: 'Stale cached role',
          appliedAt: '2025-12-31T00:00:00.000Z',
          currentStageId: 'stage-stale',
          terminalOutcome: null,
          terminalOutcomeAt: null,
          currentStageName: 'Stale stage',
          isResponded: true,
          archivedAt: null,
          duplicateAttemptCount: 0,
        },
      ],
      jobId: 'job-current',
      jobOnChainId: 12,
      jobTitle: 'Current role',
      currentStageName: 'Interview',
    });

    expect(applications.map((app) => app.id)).toEqual(['app-new', 'app-current', 'app-old']);
    expect(applications.filter((app) => app.id === 'app-current')).toHaveLength(1);
    expect(applications[1]).toMatchObject({
      jobId: 'job-current',
      jobOnChainId: 12,
      jobTitle: 'Current role',
      appliedAt: '2026-01-02T00:00:00.000Z',
      currentStageId: 'stage-current',
      currentStageName: 'Interview',
      isResponded: false,
    });
  });

  it('uses application id as a deterministic tie-break for equal effective dates', () => {
    const applications = buildConsiderations({
      application: makeApplication({ appliedAt: '2026-01-03T00:00:00.000Z' }),
      otherApplications,
      jobId: 'job-current',
      jobOnChainId: 12,
      jobTitle: 'Current role',
      currentStageName: 'Interview',
    });

    expect(applications.map((app) => app.id)).toEqual(['app-new', 'app-current', 'app-old']);
  });

  it('returns an empty sidebar model before application data is available', () => {
    expect(
      buildConsiderations({
        application: null,
        otherApplications: [],
        jobId: 'job-current',
        jobOnChainId: null,
        jobTitle: null,
        currentStageName: null,
      }),
    ).toEqual([]);
  });
});

describe('getMergedConsiderationTotal', () => {
  it('adds the selected application when the API page excludes it', () => {
    expect(getMergedConsiderationTotal(otherApplications, 2, 'app-current')).toBe(3);
  });

  it('does not double-count a selected application found in a cached page', () => {
    const cachedApplications = [
      ...otherApplications,
      {
        ...otherApplications[0],
        id: 'app-current',
      },
    ];

    expect(getMergedConsiderationTotal(cachedApplications, 3, 'app-current')).toBe(3);
  });
});
