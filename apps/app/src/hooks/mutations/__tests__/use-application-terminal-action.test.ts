import type { PublicEncryptionKey } from '@comitium/crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  archiveApplication: vi.fn(),
  getRecipientKey: vi.fn(),
  invalidateQueries: vi.fn(),
  mutationOptions: null as object | null,
  mutate: vi.fn(),
  onCompleted: vi.fn(),
  prepareEncryptedEmailDelivery: vi.fn(),
  refreshAfterOnchainOperationSettles: vi.fn(),
  reopenApplication: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  useMutation: vi.fn((options: object) => {
    mocks.mutationOptions = options;

    return { mutate: mocks.mutate, isPending: false };
  }),
}));

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@comitium/chain/onchain-operation-observer', () => ({
  refreshAfterOnchainOperationSettles: mocks.refreshAfterOnchainOperationSettles,
}));

vi.mock('@/lib/api/application-outcomes', () => ({
  archiveApplication: mocks.archiveApplication,
  reopenApplication: mocks.reopenApplication,
}));

vi.mock('@/lib/api/applications-data', () => ({
  getRecipientKey: mocks.getRecipientKey,
}));

vi.mock('@/lib/applications/communication/email-delivery', () => ({
  prepareEncryptedEmailDelivery: mocks.prepareEncryptedEmailDelivery,
}));

import { useApplicationTerminalAction } from '../use-application-terminal-action';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';
const params = {
  action: 'archive' as const,
  applicationId: '22222222-2222-4222-8222-222222222222',
  jobId: '33333333-3333-4333-8333-333333333333',
  orgId: '44444444-4444-4444-8444-444444444444',
  archiveReasonId: '55555555-5555-4555-8555-555555555555',
  notice: null,
};

interface MutationOptions {
  mutationFn: (variables: TerminalActionParams) => Promise<unknown>;
  onSuccess: (
    result: { status: 'accepted'; operationId: string } | { status: 'completed' },
    variables: typeof params,
  ) => Promise<void>;
}

type TerminalActionParams =
  | typeof params
  | {
      action: 'archive';
      applicationId: string;
      jobId: string;
      orgId: string;
      archiveReasonId: string;
      notice: {
        subject: string;
        messageDoc: { type: 'doc'; content: [] };
        messageHtml: string;
        emailTemplateId: null;
      };
      applicantEmail: string;
      vaultPublicKey: PublicEncryptionKey;
      vaultKeyVersion: number;
    }
  | {
      action: 'reopen';
      applicationId: string;
      jobId: string;
      orgId: string;
      targetStageId: string;
    };

function getMutationOptions(): MutationOptions {
  useApplicationTerminalAction({ onCompleted: mocks.onCompleted });

  return mocks.mutationOptions as MutationOptions;
}

describe('application terminal action completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = null;
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.archiveApplication.mockResolvedValue({ status: 'completed' });
    mocks.getRecipientKey.mockResolvedValue({ publicKey: { kty: 'OKP', crv: 'X25519', x: 'applicant-key' } });
    mocks.prepareEncryptedEmailDelivery.mockResolvedValue({
      content: { ciphertext: 'ciphertext' },
      deliveryGrant: { ciphertext: 'grant' },
    });
    mocks.refreshAfterOnchainOperationSettles.mockResolvedValue('completed');
    mocks.reopenApplication.mockResolvedValue({ status: 'completed' });
  });

  it('archives without fetching or encrypting a notice when none was requested', async () => {
    const options = getMutationOptions();

    await options.mutationFn(params);

    expect(mocks.archiveApplication).toHaveBeenCalledExactlyOnceWith(params.applicationId, {
      archiveReasonId: params.archiveReasonId,
      notice: null,
    });
    expect(mocks.getRecipientKey).not.toHaveBeenCalled();
    expect(mocks.prepareEncryptedEmailDelivery).not.toHaveBeenCalled();
  });

  it('encrypts an archive notice before sending the terminal action', async () => {
    const options = getMutationOptions();
    const withNotice = {
      ...params,
      notice: {
        subject: 'Application update',
        messageDoc: { type: 'doc' as const, content: [] as [] },
        messageHtml: '<p>Application update</p>',
        emailTemplateId: null,
      },
      applicantEmail: 'candidate@example.com',
      vaultPublicKey: { v: 1, xwing: 'vault-key' } as PublicEncryptionKey,
      vaultKeyVersion: 4,
    };

    await options.mutationFn(withNotice);

    expect(mocks.getRecipientKey).toHaveBeenCalledExactlyOnceWith(params.applicationId);
    expect(mocks.prepareEncryptedEmailDelivery).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        applicationId: params.applicationId,
        applicantEmail: 'candidate@example.com',
        applicantPublicKey: { kty: 'OKP', crv: 'X25519', x: 'applicant-key' },
        vaultKeyVersion: 4,
      }),
    );
    expect(mocks.archiveApplication).toHaveBeenCalledExactlyOnceWith(params.applicationId, {
      archiveReasonId: params.archiveReasonId,
      notice: {
        content: { ciphertext: 'ciphertext' },
        deliveryGrant: { ciphertext: 'grant' },
        emailTemplateId: null,
      },
    });
  });

  it('does not archive when notice encryption fails', async () => {
    mocks.prepareEncryptedEmailDelivery.mockRejectedValue(new Error('encryption failed'));
    const options = getMutationOptions();

    await expect(
      options.mutationFn({
        ...params,
        notice: {
          subject: 'Application update',
          messageDoc: { type: 'doc', content: [] },
          messageHtml: '<p>Application update</p>',
          emailTemplateId: null,
        },
        applicantEmail: 'candidate@example.com',
        vaultPublicKey: { v: 1, xwing: 'vault-key' } as PublicEncryptionKey,
        vaultKeyVersion: 4,
      }),
    ).rejects.toThrow('encryption failed');
    expect(mocks.archiveApplication).not.toHaveBeenCalled();
  });

  it('reopens directly into the requested stage without notice work', async () => {
    const options = getMutationOptions();
    const reopen = {
      action: 'reopen' as const,
      applicationId: params.applicationId,
      jobId: params.jobId,
      orgId: params.orgId,
      targetStageId: '66666666-6666-4666-8666-666666666666',
    };

    await options.mutationFn(reopen);

    expect(mocks.reopenApplication).toHaveBeenCalledExactlyOnceWith(params.applicationId, {
      targetStageId: reopen.targetStageId,
    });
    expect(mocks.archiveApplication).not.toHaveBeenCalled();
    expect(mocks.getRecipientKey).not.toHaveBeenCalled();
  });

  it('does not report archive success before the accepted operation settles', async () => {
    const options = getMutationOptions();
    let settle: (stage: 'completed') => void = () => undefined;
    const settlement = new Promise<'completed'>((resolve) => {
      settle = resolve;
    });
    mocks.refreshAfterOnchainOperationSettles.mockReturnValue(settlement);

    const completion = options.onSuccess({ status: 'accepted', operationId: OPERATION_ID }, params);

    expect(mocks.refreshAfterOnchainOperationSettles).toHaveBeenCalledWith(OPERATION_ID, expect.any(Function));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.onCompleted).not.toHaveBeenCalled();

    settle('completed');
    await completion;

    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Application archived', {
      id: 'application-terminal-action',
    });
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });

  it('refreshes completed archive state before closing the dialog', async () => {
    const options = getMutationOptions();

    await options.onSuccess({ status: 'completed' }, params);

    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.invalidateQueries.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mocks.toastSuccess.mock.invocationCallOrder[0],
    );
    expect(mocks.onCompleted).toHaveBeenCalledOnce();
  });
});
