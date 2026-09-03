import { TransactionError } from '@comitium/schemas/product-errors';
import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareOrgCreation } from '@/lib/api/orgs-creation';
import type { ExecutableOrgCreation } from '@/lib/schemas/org';

import { sendCreateOrgBundle } from '../core/contract';
import { createOrgWorkflow } from '../workflows/create-org';

vi.mock('@/lib/api/orgs-creation', () => ({
  prepareOrgCreation: vi.fn(),
}));

vi.mock('../core/contract', () => ({
  sendCreateOrgBundle: vi.fn(),
}));

const preparation: ExecutableOrgCreation = {
  state: 'wallet_confirmation',
  operationId: '11111111-2222-4333-8444-555555555555',
  requestId: '99999999-8888-4777-8666-555555555555',
  authorizationPayload: 'YXV0aG9yaXphdGlvbi1wYXlsb2Fk',
};

describe('createOrgWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prepareOrgCreation).mockResolvedValue(preparation);
    vi.mocked(sendCreateOrgBundle).mockReturnValue(okAsync({ kind: 'confirmed' }));
  });

  it('hands successful wallet submission to background confirmation', async () => {
    const result = await createOrgWorkflow();

    expect(result._unsafeUnwrap()).toEqual({ kind: 'confirming' });
    expect(prepareOrgCreation).toHaveBeenCalledOnce();
    expect(sendCreateOrgBundle).toHaveBeenCalledExactlyOnceWith(preparation);
  });

  it('hands an already confirming creation to the server-backed creating state without another send', async () => {
    vi.mocked(prepareOrgCreation).mockResolvedValue({ state: 'confirming' });

    const result = await createOrgWorkflow();

    expect(result._unsafeUnwrap()).toEqual({ kind: 'confirming' });
    expect(sendCreateOrgBundle).not.toHaveBeenCalled();
  });

  it('does not report success when the financial transaction receipt fails', async () => {
    vi.mocked(sendCreateOrgBundle).mockReturnValue(
      errAsync(new TransactionError('sendCreateOrgBundle', new Error('Transaction reverted'))),
    );

    const result = await createOrgWorkflow();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ _tag: 'TransactionError' });
  });
});
