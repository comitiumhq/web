import { describe, expect, it } from 'vitest';
import type { BulkOperationItem } from '@/lib/schemas/bulk-operations';
import { getTargetLabel, type PipelineBulkTarget, reconcilePipelineBulkSelection } from './model';

describe('getTargetLabel', () => {
  it('keeps a recovered target identifiable when its Pipeline page is not loaded', () => {
    const item = {
      selectedTargetId: '11111111-1111-4111-8111-111111111111',
    } as BulkOperationItem;
    const target: PipelineBulkTarget = {
      item,
      application: {
        applicationId: item.selectedTargetId,
        candidateId: '22222222-2222-4222-8222-222222222222',
        jobId: '33333333-3333-4333-8333-333333333333',
        jobTitle: 'Protocol Engineer',
        requiresEmail: false,
        childOperationId: null,
        recipientPublicKey: null,
        deliveryGrant: null,
      },
      pipelineApplication: null,
      profile: null,
    };

    expect(getTargetLabel(target)).toEqual({
      candidateName: 'Application 11111111',
      jobTitle: 'Protocol Engineer',
    });
  });
});

describe('reconcilePipelineBulkSelection', () => {
  it('drops rows removed by a background refresh before applying the server cap', () => {
    const selection = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`application-${index + 1}`, true]));

    expect(
      reconcilePipelineBulkSelection(
        selection,
        Array.from({ length: 10 }, (_, index) => `application-${index + 2}`),
        10,
      ),
    ).toEqual(Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`application-${index + 2}`, true])));
  });

  it('enforces the configured cap against the currently visible selection', () => {
    expect(
      reconcilePipelineBulkSelection(
        { 'application-1': true, 'application-2': true, 'application-3': true },
        ['application-1', 'application-2', 'application-3'],
        2,
      ),
    ).toEqual({ 'application-1': true, 'application-2': true });
  });
});
