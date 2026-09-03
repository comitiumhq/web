import { applicationSubmitDispositionSchema } from '@comitium/schemas/applications';
import { getOnchainOperationProductState } from '@comitium/schemas/onchain-operations';
import { describe, expect, it } from 'vitest';
import { orgCreationPreparationSchema } from '../org';

const OPERATION_ID = '11111111-2222-4333-8444-555555555555';

describe('direct wallet product state boundary', () => {
  it('maps internal reconciliation to confirming inside private direct-wallet adapters', () => {
    const application = applicationSubmitDispositionSchema.parse({
      state: getOnchainOperationProductState('repair_required', 'internal_only'),
      operationId: OPERATION_ID,
    });

    expect(application.state).toBe('confirming');
    expect(
      [application].map((value) => ({
        hasStage: 'stage' in value,
        hasTxHash: 'txHash' in value,
      })),
    ).toEqual([{ hasStage: false, hasTxHash: false }]);
  });

  it('keeps internal organization operation states out of the Web product contract', () => {
    expect(orgCreationPreparationSchema.parse({ state: 'confirming' })).toEqual({ state: 'confirming' });
    expect(() =>
      orgCreationPreparationSchema.parse({
        state: 'repair_required',
        operationId: OPERATION_ID,
      }),
    ).toThrow();
  });
});
