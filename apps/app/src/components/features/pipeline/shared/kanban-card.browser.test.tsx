import { TooltipProvider } from '@comitium/ui/tooltip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { KanbanApplication } from '@/lib/schemas/pipeline';

import { KanbanCard } from './kanban-card';

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({ handleRef: vi.fn(), isDragging: false, ref: vi.fn() }),
}));

const application: KanbanApplication = {
  id: '11111111-1111-4111-8111-111111111111',
  candidateId: '22222222-2222-4222-8222-222222222222',
  candidateProfile: null,
  appliedAt: '2026-10-02T12:00:00.000Z',
  terminalOutcome: null,
  terminalOutcomeAt: null,
  currentStageId: '33333333-3333-4333-8333-333333333333',
  currentStageEnteredAt: '2026-10-07T12:00:00.000Z',
  searchProjection: null,
  criterionSummary: null,
  updatedAt: '2026-10-12T11:00:00.000Z',
  tagIds: [],
  interviewStatus: null,
  interviewScheduledAt: null,
  reviewStatus: {
    totalReviewers: 2,
    submittedReviewers: 1,
    currentUserHasPendingReview: true,
    currentUserHasSubmittedReview: false,
    needsDecision: false,
  },
};

function renderCard(overrides: Partial<KanbanApplication> = {}) {
  return render(
    <TooltipProvider>
      <KanbanCard
        application={{ ...application, ...overrides }}
        index={0}
        column={application.currentStageId}
        decryptedName="Theo Grant"
        company="Candidate Sheet Matrix"
        onCardClick={vi.fn()}
      />
    </TooltipProvider>,
  );
}

describe('KanbanCard stage age', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows time in the current stage independently of application and update dates', async () => {
    const screen = await renderCard();

    await expect.element(screen.getByText('In stage 5d', { exact: true })).toBeVisible();
  });

  it('uses the applied date for legacy rows without a stage transition', async () => {
    const screen = await renderCard({ currentStageEnteredAt: null });

    await expect.element(screen.getByText('In stage 10d', { exact: true })).toBeVisible();
  });

  it('shows less than one day for a newly entered stage', async () => {
    const screen = await renderCard({ currentStageEnteredAt: '2026-10-12T11:00:00.000Z' });

    await expect.element(screen.getByText('In stage <1d', { exact: true })).toBeVisible();
  });
});
