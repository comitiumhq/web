import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ZkIdentityApi, ZkIdentityAttempt } from '../../zk-identity';
import { ZkIdentitySection } from '../zk-identity-section';

const mocks = vi.hoisted(() => ({
  bind: vi.fn(),
  cancelRequest: vi.fn(),
  constructorOptions: undefined as { disableProofStorage?: boolean } | undefined,
  facematch: vi.fn(),
  gte: vi.fn(),
  onError: undefined as (() => void) | undefined,
  onResult: undefined as ((response: Record<string, unknown>) => Promise<void>) | undefined,
  request: vi.fn(),
  toDataURL: vi.fn(),
}));

vi.mock('@zkpassport/sdk', () => ({
  NullifierType: { SALTED: 1 },
  ZKPassport: class {
    constructor(_domain: string, options?: { disableProofStorage?: boolean }) {
      mocks.constructorOptions = options;
    }

    cancelRequest = mocks.cancelRequest;
    request = mocks.request;
  },
}));

vi.mock('qrcode', () => ({ toDataURL: mocks.toDataURL }));

const attempt: ZkIdentityAttempt = {
  attemptId: '019945cd-c640-7000-8000-000000000001',
  challenge: 'a'.repeat(64),
  expiresAt: '2026-09-11T12:15:00.000Z',
  request: {
    devMode: false,
    domain: 'comitium.co',
    minimumAge: 18,
    proofMode: 'compressed',
    purpose: 'Verify that you are at least 18 and match your ID photo.',
    scope: 'comitium-account-identity-v1',
    validitySeconds: 900,
  },
};

function createApi(): ZkIdentityApi {
  return {
    completeZkIdentityAttempt: vi.fn().mockResolvedValue({
      status: 'verified',
      verificationMode: 'live',
      verifiedAt: '2026-09-11T12:05:00.000Z',
    }),
    createZkIdentityAttempt: vi.fn().mockResolvedValue(attempt),
    getZkIdentityStatus: vi
      .fn()
      .mockResolvedValueOnce({ status: 'not_started' })
      .mockResolvedValue({ status: 'verified', verificationMode: 'live', verifiedAt: '2026-09-11T12:05:00.000Z' }),
  };
}

function renderSection(api: ZkIdentityApi) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <ZkIdentitySection api={api} queryKey={['account', 'zk-identity', 'privy-user-1']} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.bind.mockReset();
  mocks.cancelRequest.mockReset();
  mocks.constructorOptions = undefined;
  mocks.facematch.mockReset();
  mocks.gte.mockReset();
  mocks.onError = undefined;
  mocks.onResult = undefined;
  mocks.request.mockReset();
  mocks.toDataURL.mockReset();
  mocks.toDataURL.mockResolvedValue('data:image/png;base64,qr');

  const request = {
    query: {
      age: { gte: 18 },
      bind: { custom_data: attempt.challenge },
      facematch: { mode: 'strict' },
    },
    requestId: 'request-1',
    url: 'https://zkpassport.id/r?request=1',
    onError: vi.fn((callback) => {
      mocks.onError = callback;
    }),
    onGeneratingProof: vi.fn(),
    onReject: vi.fn(),
    onRequestReceived: vi.fn(),
    onResult: vi.fn((callback) => {
      mocks.onResult = callback;
    }),
  };
  const builder = {
    bind: mocks.bind,
    done: vi.fn(() => request),
    facematch: mocks.facematch,
    gte: mocks.gte,
  };
  mocks.gte.mockReturnValue(builder);
  mocks.facematch.mockReturnValue(builder);
  mocks.bind.mockReturnValue(builder);
  mocks.request.mockResolvedValue(builder);
});

describe('ZK Identity account integration', () => {
  it('requests only the approved private predicates and disables vendor proof storage', async () => {
    const screen = await renderSection(createApi());

    await expect.element(screen.getByText(/uses zero-knowledge cryptography/)).toBeInTheDocument();
    await expect.element(screen.getByText(/personal details never leave your phone/)).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Verify with zkPassport' }).click();
    await expect.element(screen.getByAltText(/QR code/)).toBeInTheDocument();

    expect(mocks.constructorOptions).toEqual({ disableProofStorage: true });
    expect(mocks.gte).toHaveBeenCalledExactlyOnceWith('age', 18);
    expect(mocks.facematch).toHaveBeenCalledExactlyOnceWith('strict');
    expect(mocks.bind).toHaveBeenCalledExactlyOnceWith('custom_data', attempt.challenge);
  });

  it('uses only the API verdict even when the browser verdict is false', async () => {
    const api = createApi();
    const screen = await renderSection(api);

    await screen.getByRole('button', { name: 'Verify with zkPassport' }).click();
    await expect.element(screen.getByAltText(/QR code/)).toBeInTheDocument();

    await mocks.onResult?.({
      verified: false,
      uniqueIdentifier: 'must-not-be-used',
      proofs: [{ proof: 'proof' }],
      result: {
        age: { gte: { expected: 18, result: true } },
        bind: { custom_data: attempt.challenge },
        facematch: { mode: 'strict', passed: true },
      },
    });

    expect(api.completeZkIdentityAttempt).toHaveBeenCalledWith(attempt.attemptId, {
      originalQuery: {
        age: { gte: 18 },
        bind: { custom_data: attempt.challenge },
        facematch: { mode: 'strict' },
      },
      proofs: [{ proof: 'proof' }],
      queryResult: {
        age: { gte: { expected: 18, result: true } },
        bind: { custom_data: attempt.challenge },
        facematch: { mode: 'strict', passed: true },
      },
    });
    await expect.element(screen.getByText('ZK Identity verified')).toBeInTheDocument();
  });

  it('disables restart while replacing an attempt and reports a restart failure', async () => {
    const api = createApi();
    let rejectRestart: ((error: Error) => void) | undefined;
    api.createZkIdentityAttempt = vi
      .fn()
      .mockResolvedValueOnce(attempt)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRestart = reject;
          }),
      );
    const screen = await renderSection(api);

    await screen.getByRole('button', { name: 'Verify with zkPassport' }).click();
    await expect.element(screen.getByAltText(/QR code/)).toBeInTheDocument();

    mocks.onError?.();
    await screen.getByRole('button', { name: 'Start again' }).click();
    await expect.element(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(api.createZkIdentityAttempt).toHaveBeenCalledTimes(2);

    rejectRestart?.(new Error('unavailable'));
    await expect.element(screen.getByText('Could not start a new verification. Please try again.')).toBeInTheDocument();
  });

  it('does not present a mock verification as real-person uniqueness', async () => {
    const api = createApi();
    api.getZkIdentityStatus = vi.fn().mockResolvedValue({
      status: 'verified',
      verificationMode: 'mock',
      verifiedAt: '2026-09-11T12:05:00.000Z',
    });
    const screen = await renderSection(api);

    await expect.element(screen.getByText('ZK Identity verified in development mode')).toBeInTheDocument();
    await expect.element(screen.getByText(/does not verify a real person/)).toBeInTheDocument();
  });
});
