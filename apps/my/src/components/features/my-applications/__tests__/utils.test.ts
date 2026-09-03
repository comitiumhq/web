import type { MyApplicationResponse } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';
import { getApplicationStatus } from '../utils';

function application(overrides: Partial<MyApplicationResponse> = {}): MyApplicationResponse {
  return {
    id: 'app-id',
    applicationId: '0xapplication',
    jobId: 'job-id',
    archivedAt: null,
    archiveReasonType: null,
    appliedAt: '2026-06-01T12:00:00.000Z',
    isResponded: false,
    respondedAt: null,
    responseKind: null,
    stakeAmount: '1000000',
    stakeWithdrawn: false,
    withdrawnAt: null,
    responseDeadline: '2099-06-16T12:00:00.000Z',
    terminalOutcome: null,
    terminalOutcomeAt: null,
    candidateStatus: {
      state: 'submitted',
      reason: 'awaiting_response',
      needsAction: false,
    },
    createdAt: '2026-06-01T12:00:00.000Z',
    job: null,
    ...overrides,
  };
}

describe('my applications utils', () => {
  it('keeps responded stake returns out of candidate action state', () => {
    const app = application({
      isResponded: true,
      candidateStatus: {
        state: 'in_process',
        reason: 'response_received',
        needsAction: false,
      },
    });
    const status = getApplicationStatus(app);

    expect(status.needsAction).toBe(false);
    expect(status.lifecycle).toBe('in_process');
  });

  it('keeps overdue unanswered applications active', () => {
    const app = application({
      responseDeadline: '2000-01-01T00:00:00.000Z',
      candidateStatus: {
        state: 'submitted',
        reason: 'response_overdue',
        needsAction: false,
      },
    });
    const status = getApplicationStatus(app);

    expect(status.needsAction).toBe(false);
    expect(status.lifecycle).toBe('submitted');
    expect(status.filter).toBe('active');
  });

  it('shows the exact terminal outcome instead of inferring it from the job', () => {
    const status = getApplicationStatus(
      application({ terminalOutcome: 'hired', terminalOutcomeAt: '2026-06-20T12:00:00.000Z' }),
    );

    expect(status.label).toBe('Hired');
    expect(status.lifecycle).toBe('application_closed');
    expect(status.reason).toBe('hired');
  });
});
