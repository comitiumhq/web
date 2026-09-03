import { describe, expect, it } from 'vitest';

import type { KanbanApplication, KanbanResponse, KanbanStage } from '@/lib/schemas/pipeline';

import { mergeKanbanStagePage } from '../kanban-pagination';

function application(id: string): KanbanApplication {
  return {
    id,
    candidateId: null,
    candidateProfile: null,
    appliedAt: '2026-07-11T12:00:00.000Z',
    responseDeadline: null,
    isResponded: true,
    terminalOutcome: null,
    terminalOutcomeAt: null,
    currentStageId: 'stage-1',
    currentStageEnteredAt: null,
    searchProjection: null,
    criterionSummary: null,
    updatedAt: null,
    tagIds: [],
    interviewStatus: null,
    interviewScheduledAt: null,
    reviewStatus: {
      totalReviewers: 0,
      submittedReviewers: 0,
      currentUserHasPendingReview: false,
      currentUserHasSubmittedReview: false,
      needsDecision: false,
    },
    duplicateAttemptCount: 0,
  };
}

function stage(id: string, applications: KanbanApplication[], nextCursor: string | null): KanbanStage {
  return {
    id,
    name: id,
    stageOrder: 0,
    stageType: 'active',
    applications,
    total: 3,
    nextCursor,
  };
}

describe('mergeKanbanStagePage', () => {
  it('appends and deduplicates one stage page without replacing sibling stages', () => {
    const sibling = stage('stage-2', [application('sibling')], null);
    const current: KanbanResponse = {
      stages: [stage('stage-1', [application('one'), application('two')], 'cursor-2'), sibling],
      archivedCount: 0,
    };
    const page: KanbanResponse = {
      stages: [stage('stage-1', [application('two'), application('three')], null)],
      archivedCount: 0,
    };

    const merged = mergeKanbanStagePage(current, page, 'stage-1');

    expect(merged.stages[0]?.applications.map((item) => item.id)).toEqual(['one', 'two', 'three']);
    expect(merged.stages[0]?.nextCursor).toBeNull();
    expect(merged.stages[1]).toBe(sibling);
  });
});
