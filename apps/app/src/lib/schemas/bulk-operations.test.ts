import { describe, expect, it } from 'vitest';
import { bulkOperationSchema } from './bulk-operations';

describe('bulk operation response', () => {
  it('accepts an API draft with a resolved keyless applicant and all seven item counters', () => {
    const response = {
      id: 'operation-1',
      operationType: 'application.assign_candidate_tag',
      operationVersion: 1,
      targetType: 'application',
      status: 'draft',
      targetCount: 1,
      parameters: null,
      committedAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-10-29T19:00:00.000Z',
      updatedAt: '2026-10-29T19:00:00.000Z',
      counts: { ready: 1, excluded: 0, pending: 0, processing: 0, succeeded: 0, skipped: 0, failed: 0 },
      items: [
        {
          id: 'item-1',
          ordinal: 1,
          selectedTargetId: 'application-1',
          status: 'ready',
          exclusion: null,
          error: null,
          completedAt: null,
          application: {
            applicationId: 'application-1',
            candidateId: 'candidate-1',
            jobId: 'job-1',
            jobTitle: 'Backend Engineer',
            requiresEmail: false,
            recipientPublicKey: null,
            recipientKeyVersion: null,
            deliveryGrant: null,
          },
        },
      ],
    };

    expect(bulkOperationSchema.parse(response)).toEqual(response);
  });
});
