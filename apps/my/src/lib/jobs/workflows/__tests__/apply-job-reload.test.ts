import type { JobApplicationData } from '@comitium/schemas/jobs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApplyJobWorkflowParams, applyJobWorkflow } from '../apply-job';

const mocks = vi.hoisted(() => ({
  encryptApplication: vi.fn(async () => ({ v: 1, purpose: 'test', zip: 'none', ct: '', iv: '', keys: [] })),
  encryptApplicationWithOverlays: vi.fn(async () => ({
    envelope: { v: 1, purpose: 'test', zip: 'none', ct: '', iv: '', keys: [] },
    overlayKeys: [{ recipient: 'processor:test-grant' }],
  })),
  encryptFile: vi.fn(async () => new Uint8Array([1, 2, 3])),
  encryptFileWithOverlays: vi.fn(async () => ({
    blob: new Uint8Array([1, 2, 3]),
    overlayKeys: [{ recipient: 'processor:test-grant' }],
  })),
  finalizeApplication: vi.fn(),
  prepareApplication: vi.fn(),
  reserveApplicationFile: vi.fn(async () => ({ uploadToken: 'upload-token' })),
  retryApplicationOnchainOperation: vi.fn(),
  submitPreparedUserWalletOnchainOperation: vi.fn(),
  uploadApplicationFile: vi.fn(),
  waitForOperationReceipt: vi.fn(),
}));

vi.mock('@/lib/api/applications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/applications')>()),
  finalizeApplication: mocks.finalizeApplication,
  prepareApplication: mocks.prepareApplication,
  reserveApplicationFile: mocks.reserveApplicationFile,
  retryApplicationOnchainOperation: mocks.retryApplicationOnchainOperation,
  uploadApplicationFile: mocks.uploadApplicationFile,
}));

vi.mock('@comitium/auth/user-wallet-operation', () => ({
  submitPreparedUserWalletOnchainOperation: mocks.submitPreparedUserWalletOnchainOperation,
}));

vi.mock('@comitium/crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@comitium/crypto')>()),
  CryptoProxy: {
    encryptApplication: mocks.encryptApplication,
    encryptApplicationWithOverlays: mocks.encryptApplicationWithOverlays,
    encryptFile: mocks.encryptFile,
    encryptFileWithOverlays: mocks.encryptFileWithOverlays,
  },
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  waitForOperationReceipt: mocks.waitForOperationReceipt,
}));

const APPLICATION_DB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPERATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function runWorkflow(overrides: Partial<ApplyJobWorkflowParams> = {}) {
  return applyJobWorkflow({
    address: '0x1111111111111111111111111111111111111111',
    jobData: {
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      postingId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      chainId: 84532,
      jobId: 1,
      orgId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      commitmentContract: '0x2222222222222222222222222222222222222222',
      creatorAddress: '0x3333333333333333333333333333333333333333',
    } as JobApplicationData,
    stakeAmount: 5_000_000n,
    formId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    answerBuckets: [],
    fieldValues: [],
    candidateIdentityInputs: [],
    candidateProfileInput: { firstName: 'Ada', lastName: 'Lovelace' },
    aiCriteriaEvaluation: { policyEnabled: true, optOut: false },
    resumeUpload: null,
    fileUploads: [],
    ...overrides,
  });
}

describe('applyJobWorkflow reload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForOperationReceipt.mockResolvedValue({ kind: 'confirmed' });
    mocks.retryApplicationOnchainOperation.mockResolvedValue({ state: 'completed', operationId: OPERATION_ID });
    mocks.submitPreparedUserWalletOnchainOperation.mockResolvedValue({ kind: 'confirmed' });
    mocks.prepareApplication.mockResolvedValue({
      kind: 'existing',
      applicationId: APPLICATION_DB_ID,
      disposition: {
        state: 'confirming',
        operationId: OPERATION_ID,
      },
    });
  });

  it('confirms an existing application without rebuilding its submission', async () => {
    const result = await runWorkflow();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ kind: 'confirmed', operationId: OPERATION_ID });
    expect(mocks.prepareApplication).toHaveBeenCalledTimes(1);
    expect(mocks.waitForOperationReceipt).toHaveBeenCalledExactlyOnceWith(OPERATION_ID);
  });

  it('returns an already completed application without polling its receipt again', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'existing',
      applicationId: APPLICATION_DB_ID,
      disposition: {
        state: 'completed',
        operationId: OPERATION_ID,
      },
    });

    const result = await runWorkflow();

    expect(result._unsafeUnwrap()).toEqual({ kind: 'completed', operationId: OPERATION_ID });
    expect(mocks.waitForOperationReceipt).not.toHaveBeenCalled();
  });

  it('does not report application success when the existing receipt reverted', async () => {
    mocks.waitForOperationReceipt.mockRejectedValue(new Error('Transaction reverted'));

    const result = await runWorkflow();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ _tag: 'SignatureError' });
  });

  it('restores background confirmation after reload without preparing or sending again', async () => {
    mocks.waitForOperationReceipt.mockResolvedValue({ kind: 'confirming' });

    const result = await runWorkflow();

    expect(result._unsafeUnwrap()).toEqual({ kind: 'confirming', operationId: OPERATION_ID });
    expect(mocks.waitForOperationReceipt).toHaveBeenCalledExactlyOnceWith(OPERATION_ID);
  });

  it('passes the displayed criteria-evaluation policy and candidate opt-out to finalization', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'prepared',
      applicationId: APPLICATION_DB_ID,
      formSnapshotHash: `0x${'1'.repeat(64)}`,
      processingGrant: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', processorPublicKey: {} },
      vaultKey: { vaultPublicKey: {}, keyVersion: 1 },
      filePolicy: { kinds: {} },
    });
    mocks.finalizeApplication.mockResolvedValue({ state: 'completed', operationId: OPERATION_ID });

    const result = await runWorkflow({
      candidateIdentityInputs: [
        {
          questionId: '99999999-9999-4999-8999-999999999999',
          value: 'candidate@example.com',
          processorAccess: true,
        },
      ],
      aiCriteriaEvaluation: { policyEnabled: true, optOut: true },
    });

    expect(result.isOk()).toBe(true);
    expect(mocks.finalizeApplication).toHaveBeenCalledWith(
      APPLICATION_DB_ID,
      expect.objectContaining({ aiCriteriaEvaluation: { policyEnabled: true, optOut: true } }),
    );
  });

  it('grants temporary resume access when the candidate opts out of evaluation', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'prepared',
      applicationId: APPLICATION_DB_ID,
      formSnapshotHash: `0x${'1'.repeat(64)}`,
      processingGrant: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', processorPublicKey: {} },
      vaultKey: { vaultPublicKey: {}, keyVersion: 1 },
      filePolicy: {
        kinds: {
          resume: { maxPlaintextBytes: 1024, mimeTypes: ['application/pdf'] },
        },
      },
    });
    mocks.finalizeApplication.mockResolvedValue({ state: 'completed', operationId: OPERATION_ID });

    const result = await runWorkflow({
      candidateIdentityInputs: [
        {
          questionId: '99999999-9999-4999-8999-999999999999',
          value: 'candidate@example.com',
          processorAccess: true,
        },
      ],
      aiCriteriaEvaluation: { policyEnabled: true, optOut: true },
      resumeUpload: {
        fileId: '77777777-7777-4777-8777-777777777777',
        questionId: '88888888-8888-4888-8888-888888888888',
        file: new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' }),
      },
    });

    const [, input] = mocks.finalizeApplication.mock.calls[0];

    expect(result.isOk()).toBe(true);
    expect(mocks.encryptFile).not.toHaveBeenCalled();
    expect(mocks.encryptFileWithOverlays).toHaveBeenCalledOnce();
    expect(input.wrappedKeys).toEqual(expect.arrayContaining([expect.objectContaining({ slot: 'resume' })]));
  });

  it('grants temporary resume access when organization criteria evaluation is disabled', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'prepared',
      applicationId: APPLICATION_DB_ID,
      formSnapshotHash: `0x${'1'.repeat(64)}`,
      processingGrant: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', processorPublicKey: {} },
      vaultKey: { vaultPublicKey: {}, keyVersion: 1 },
      filePolicy: {
        kinds: {
          resume: { maxPlaintextBytes: 1024, mimeTypes: ['application/pdf'] },
        },
      },
    });
    mocks.finalizeApplication.mockResolvedValue({ state: 'completed', operationId: OPERATION_ID });

    const result = await runWorkflow({
      candidateIdentityInputs: [
        {
          questionId: '99999999-9999-4999-8999-999999999999',
          value: 'candidate@example.com',
          processorAccess: true,
        },
      ],
      aiCriteriaEvaluation: { policyEnabled: false, optOut: false },
      resumeUpload: {
        fileId: '77777777-7777-4777-8777-777777777777',
        questionId: '88888888-8888-4888-8888-888888888888',
        file: new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' }),
      },
    });

    const [, input] = mocks.finalizeApplication.mock.calls[0];

    expect(result.isOk()).toBe(true);
    expect(mocks.encryptFile).not.toHaveBeenCalled();
    expect(mocks.encryptFileWithOverlays).toHaveBeenCalledOnce();
    expect(input.wrappedKeys).toEqual(expect.arrayContaining([expect.objectContaining({ slot: 'resume' })]));
  });

  it('retries an existing actionable operation without rebuilding encrypted submission data', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'existing',
      applicationId: APPLICATION_DB_ID,
      disposition: { state: 'try_again', operationId: OPERATION_ID },
    });

    const result = await runWorkflow();

    expect(result._unsafeUnwrap()).toEqual({ kind: 'completed', operationId: OPERATION_ID });
    expect(mocks.retryApplicationOnchainOperation).toHaveBeenCalledExactlyOnceWith(
      APPLICATION_DB_ID,
      OPERATION_ID,
      '5000000',
    );
    expect(mocks.encryptApplication).not.toHaveBeenCalled();
    expect(mocks.finalizeApplication).not.toHaveBeenCalled();
  });

  it('submits a prepared wallet operation exactly once and reports the submitting step', async () => {
    const onStep = vi.fn();
    const operation = { operationId: OPERATION_ID, chainId: 84532, calls: [] };
    mocks.prepareApplication.mockResolvedValue({
      kind: 'existing',
      applicationId: APPLICATION_DB_ID,
      disposition: { state: 'wallet_confirmation', operation },
    });

    const result = await runWorkflow({ onStep });

    expect(result._unsafeUnwrap()).toEqual({ kind: 'confirmed', operationId: OPERATION_ID });
    expect(onStep).toHaveBeenCalledExactlyOnceWith('submitting');
    expect(mocks.submitPreparedUserWalletOnchainOperation).toHaveBeenCalledExactlyOnceWith(operation);
  });

  it('maps wallet rejection to the transaction error boundary', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'existing',
      applicationId: APPLICATION_DB_ID,
      disposition: {
        state: 'wallet_confirmation',
        operation: { operationId: OPERATION_ID, chainId: 84532, calls: [] },
      },
    });
    mocks.submitPreparedUserWalletOnchainOperation.mockRejectedValue(new Error('User rejected request'));

    const result = await runWorkflow();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ _tag: 'TransactionError', operation: 'sendApplication' });
  });

  it('rejects a disallowed attachment before reservation, upload, or finalization', async () => {
    mocks.prepareApplication.mockResolvedValue({
      kind: 'prepared',
      applicationId: APPLICATION_DB_ID,
      formSnapshotHash: `0x${'1'.repeat(64)}`,
      processingGrant: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', processorPublicKey: {} },
      vaultKey: { vaultPublicKey: {}, keyVersion: 1 },
      filePolicy: {
        kinds: {
          attachment: { maxPlaintextBytes: 2, mimeTypes: ['application/pdf'] },
        },
      },
    });

    const result = await runWorkflow({
      candidateIdentityInputs: [
        {
          questionId: '99999999-9999-4999-8999-999999999999',
          value: 'candidate@example.com',
          processorAccess: true,
        },
      ],
      fileUploads: [
        {
          fileId: '77777777-7777-4777-8777-777777777777',
          questionId: '88888888-8888-4888-8888-888888888888',
          visibility: 'standard',
          file: new File(['too large'], 'portfolio.txt', { type: 'text/plain' }),
        },
      ],
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({ _tag: 'EncryptionError' });
    expect(mocks.reserveApplicationFile).not.toHaveBeenCalled();
    expect(mocks.uploadApplicationFile).not.toHaveBeenCalled();
    expect(mocks.finalizeApplication).not.toHaveBeenCalled();
  });
});
