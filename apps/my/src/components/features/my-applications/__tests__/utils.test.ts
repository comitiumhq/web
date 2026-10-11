import type { MyApplicationResponse } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';
import { getApplicationStatus } from '../utils';

function application(overrides: Partial<MyApplicationResponse> = {}): MyApplicationResponse {
  return {
    id: 'app-id',
    jobId: 'job-id',
    archivedAt: null,
    archiveReasonType: null,
    appliedAt: '2026-06-01T12:00:00.000Z',
    terminalOutcome: null,
    terminalOutcomeAt: null,
    candidateStatus: {
      state: 'submitted',
      reason: 'application_submitted',
      needsAction: false,
    },
    createdAt: '2026-06-01T12:00:00.000Z',
    job: null,
    ...overrides,
  };
}

describe('my applications utils', () => {
  it('shows the exact terminal outcome instead of inferring it from the job', () => {
    const status = getApplicationStatus(
      application({ terminalOutcome: 'hired', terminalOutcomeAt: '2026-06-20T12:00:00.000Z' }),
    );

    expect(status.label).toBe('Hired');
    expect(status.lifecycle).toBe('application_closed');
    expect(status.reason).toBe('hired');
  });
});
