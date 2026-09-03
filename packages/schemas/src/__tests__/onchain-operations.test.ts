import { describe, expect, it } from 'vitest';

import { preparedOnchainOperationSchema } from '../jobs';
import {
  getOnchainOperationProductState,
  onchainExecutionStatusSchema,
  onchainOperationStageSchema,
} from '../onchain-operations';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';

describe('on-chain operation read contract', () => {
  it('accepts the closed raw control-plane stage set at the API boundary', () => {
    expect(onchainOperationStageSchema.options).toEqual([
      'awaiting_signature',
      'pending',
      'completed',
      'failed',
      'expired',
      'repair_required',
    ]);
  });

  it('maps relayed command responses to product states before feature code', () => {
    const prepared = preparedOnchainOperationSchema.parse({
      operationId: OPERATION_ID,
      state: 'confirming',
      signatureRequest: null,
    });
    expect(prepared).toMatchObject({ state: 'confirming' });
    expect(prepared).toEqual({
      operationId: OPERATION_ID,
      state: 'confirming',
      signatureRequest: null,
    });
  });

  it('keeps background confirmation as a private receipt disposition', () => {
    expect(onchainExecutionStatusSchema.parse({ status: 'background_confirming' })).toEqual({
      status: 'background_confirming',
    });
  });

  it('maps transport rejection to a retryable product state', () => {
    expect(getOnchainOperationProductState('awaiting_signature', 'submission_rejected')).toBe('try_again');
  });
});
