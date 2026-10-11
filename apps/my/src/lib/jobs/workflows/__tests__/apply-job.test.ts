import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), finalize: vi.fn(), encrypt: vi.fn() }));

vi.mock('@/lib/api/applications', () => ({ prepareApplication: mocks.prepare, finalizeApplication: mocks.finalize }));
vi.mock('../application-intake', () => ({ prepareApplicationFinalization: mocks.encrypt }));

import { type ApplyJobWorkflowParams, applyJobWorkflow } from '../apply-job';

const input = {
  jobData: { postingId: 'posting', orgId: 'org', skillsRevision: 3 },
  formId: 'form',
  answerBuckets: [],
  candidateIdentityInputs: [],
  candidateProfileInput: {},
  resumeUpload: null,
  fileUploads: [],
  aiCriteriaEvaluation: {},
} as unknown as ApplyJobWorkflowParams;

describe('public Apply workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prepare.mockResolvedValue({ kind: 'prepared', applicationId: 'app' });
    mocks.encrypt.mockResolvedValue({ encryptedAnswers: 'ciphertext' });
    mocks.finalize.mockResolvedValue({ applicationId: 'app' });
  });
  it('completes after encrypted intake is finalized', async () => {
    const steps: string[] = [];
    const result = await applyJobWorkflow({ ...input, onStep: (step) => steps.push(step) });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ kind: 'completed' });
    expect(mocks.finalize).toHaveBeenCalledExactlyOnceWith('app', { encryptedAnswers: 'ciphertext' });
    expect(steps).toEqual(['encrypting', 'submitting']);
  });
  it('reloads an already completed application without reuploading or finalizing', async () => {
    mocks.prepare.mockResolvedValue({ kind: 'existing', applicationId: 'app' });

    const result = await applyJobWorkflow(input);

    expect(result._unsafeUnwrap()).toEqual({ kind: 'completed' });
    expect(mocks.encrypt).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
  it('keeps finalization blocked when encryption or upload fails', async () => {
    mocks.encrypt.mockRejectedValue(new Error('Upload failed'));

    const result = await applyJobWorkflow(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('EncryptionError');
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
});
