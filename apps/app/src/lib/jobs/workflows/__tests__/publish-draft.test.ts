import type { WalletAccount } from '@comitium/auth/send-calls';
import type { JobDraft } from '@comitium/schemas/jobs';
import type { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    ApiError,
    isApiError: (error: unknown) => error instanceof ApiError,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

vi.mock('@/lib/onchain-operation-signatures', () => ({
  submitAndConfirmPreparedRelayedOperation: vi.fn(),
}));

vi.mock('@comitium/chain/contracts', () => ({
  CONTRACT_ADDRESS: {
    JOB_FUNDS: '0x1111111111111111111111111111111111111111',
    ORGANIZATION_REGISTRY: '0x2222222222222222222222222222222222222222',
  },
}));

vi.mock('@comitium/chain/generated/contracts', () => ({
  jobCommitmentAbi: [],
  jobFundsAbi: [],
  organizationRegistryAbi: [],
}));

import { api } from '@/lib/api/client';
import { submitAndConfirmPreparedRelayedOperation } from '@/lib/onchain-operation-signatures';

import { publishDraftWorkflow } from '../publish-draft';

const mockApi = api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
const mockSubmitAndConfirm = vi.mocked(submitAndConfirmPreparedRelayedOperation);

const OPERATION_ID = '22222222-2222-4222-8222-222222222222';
const ACCOUNT_ADDRESS = '0x9999999999999999999999999999999999999999' as Address;

const mockDraft: JobDraft = {
  id: 'job-uuid',
  title: 'Senior Engineer',
  description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }] },
  departmentId: 'department-uuid',
  locationId: 'location-uuid',
  location: [{ name: 'Berlin', cityId: 2950159 }],
  locationType: 'remote',
  employmentType: 'full_time',
  category: 'engineering',
  compensation: { tiers: [{ currency: 'USD', period: 'year', base_min: 100000, base_max: 150000 }] },
  formId: null,
  criteria: null,
  interviewPlanId: null,
  hiringTeam: null,
  sourceJobId: null,
  version: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockAccount = {
  address: ACCOUNT_ADDRESS,
  signTypedData: vi.fn(),
} as unknown as WalletAccount;

function baseParams() {
  return {
    orgId: 'org-uuid',
    jobId: 'job-uuid',
    draft: mockDraft,
    expectedVersion: 7,
    stakeUsd: 300,
    feeTier: 1,
    account: mockAccount,
    descriptionMarkdown: '## About\n\nTest',
  };
}

function prepareResponse() {
  return {
    operationId: OPERATION_ID,
    state: 'wallet_confirmation' as const,
    signatureRequest: null,
  };
}

function setupHappyPath() {
  mockApi.post.mockResolvedValue(prepareResponse());
  mockSubmitAndConfirm.mockResolvedValue({ kind: 'confirmed' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('publishDraftWorkflow', () => {
  describe('validation', () => {
    it('rejects empty title', async () => {
      const result = await publishDraftWorkflow({ ...baseParams(), draft: { ...mockDraft, title: '' } });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('ValidationError');
    });

    it('rejects empty descriptionMarkdown', async () => {
      const result = await publishDraftWorkflow({ ...baseParams(), descriptionMarkdown: '' });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('ValidationError');
    });
  });

  describe('operation flow', () => {
    it('sends user intent to API without caller-provided contentUri', async () => {
      setupHappyPath();

      await publishDraftWorkflow(baseParams());

      const body = mockApi.post.mock.calls[0][1];

      expect(body).toEqual({
        expectedVersion: 7,
        stake: '300000000',
        feeTier: 1,
        maxApplications: undefined,
        descriptionMarkdown: '## About\n\nTest',
      });
    });

    it('returns only after the prepared financial operation is receipt-confirmed', async () => {
      setupHappyPath();

      const result = await publishDraftWorkflow(baseParams());

      expect(mockSubmitAndConfirm).toHaveBeenCalledWith(
        'org-uuid',
        expect.objectContaining({ operationId: OPERATION_ID, state: 'wallet_confirmation' }),
        mockAccount,
      );
      expect(result._unsafeUnwrap()).toEqual({
        id: 'job-uuid',
        operationId: OPERATION_ID,
        state: 'confirmed',
      });
    });

    it('does not resolve while financial receipt confirmation is pending', async () => {
      setupHappyPath();
      let confirmReceipt = () => {};
      const pendingReceipt = new Promise<{ kind: 'confirmed' }>((resolve) => {
        confirmReceipt = () => resolve({ kind: 'confirmed' });
      });
      mockSubmitAndConfirm.mockReturnValue(pendingReceipt);
      const result = publishDraftWorkflow(baseParams());
      const settled = vi.fn();
      result.then(settled);

      await vi.waitFor(() => expect(mockSubmitAndConfirm).toHaveBeenCalledOnce());
      expect(settled).not.toHaveBeenCalled();

      confirmReceipt();

      expect((await result).isOk()).toBe(true);
      expect(settled).toHaveBeenCalledOnce();
    });

    it('returns a non-success handoff when financial confirmation requires background work', async () => {
      setupHappyPath();
      mockSubmitAndConfirm.mockResolvedValue({ kind: 'confirming' });

      const result = await publishDraftWorkflow(baseParams());

      expect(result._unsafeUnwrap()).toEqual({
        id: 'job-uuid',
        operationId: OPERATION_ID,
        state: 'confirming',
      });
    });

    it('returns a transaction error when signature submission fails', async () => {
      setupHappyPath();
      mockSubmitAndConfirm.mockRejectedValue(new Error('Transaction reverted'));

      const result = await publishDraftWorkflow(baseParams());

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('TransactionError');
    });
  });
});
