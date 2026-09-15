import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProofResult, QueryBuilder, QueryBuilderResult } from '@zkpassport/sdk';
import type { ZKPassportQRCodeProps } from '@zkpassport/ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ZkIdentityApi, ZkIdentityAttempt } from '../../zk-identity';
import { ZkIdentitySection } from '../zk-identity-section';

const mocks = vi.hoisted(() => ({
  bind: vi.fn(),
  done: vi.fn(),
  policy: vi.fn(),
  props: undefined as ZKPassportQRCodeProps | undefined,
}));

vi.mock('@zkpassport/sdk', () => ({
  NullifierType: { SALTED: 1 },
}));

vi.mock('@zkpassport/ui/react', () => ({
  ZKPassportQRCode: (props: ZKPassportQRCodeProps) => {
    mocks.props = props;

    return <section aria-label="Official ZKPassport verification" />;
  },
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

const attempt: ZkIdentityAttempt = {
  attemptId: '019945cd-c640-7000-8000-000000000001',
  challenge: 'a'.repeat(64),
  request: {
    domain: 'comitium.co',
    oprfKeyId: '1',
    policyId: 'policy-1',
    proofMode: 'fast',
  },
};

const originalQuery = {
  age: { gte: 18 },
  bind: { custom_data: attempt.challenge },
  facematch: { mode: 'strict' },
  sanctions: { countries: 'all', lists: 'all', strict: false },
} as const;

const proof = {
  proof: 'proof-bytes',
  vkeyHash: 'vkey-hash',
  version: '0.16.2',
  name: 'compare_age',
  index: 0,
  total: 1,
} satisfies ProofResult;

const request = {
  query: originalQuery,
  requestId: 'request-1',
  url: 'https://zkpassport.id/r?request=1',
  policy: 'policy-1',
} as QueryBuilderResult;

const builder = {
  bind: mocks.bind,
  done: mocks.done,
  policy: mocks.policy,
} as unknown as QueryBuilder;

function createApi(): ZkIdentityApi {
  return {
    completeZkIdentityAttempt: vi.fn().mockResolvedValue({
      status: 'verified',
      verifiedAt: '2026-09-11T12:05:00.000Z',
    }),
    createZkIdentityAttempt: vi.fn().mockResolvedValue(attempt),
    getZkIdentityStatus: vi.fn().mockResolvedValue({ status: 'not_started' }),
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

async function startVerification(screen: Awaited<ReturnType<typeof renderSection>>) {
  await screen.getByRole('button', { name: 'Verify' }).click();
  await expect.element(screen.getByRole('dialog', { name: 'ZKPassport verification' })).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Official ZKPassport verification')).toBeInTheDocument();
}

function buildPolicyRequest() {
  const props = mocks.props;

  if (!props) {
    throw new Error('ZKPassportQRCode was not rendered');
  }

  return props.query(builder);
}

beforeEach(() => {
  mocks.bind.mockReset();
  mocks.done.mockReset();
  mocks.policy.mockReset();
  mocks.props = undefined;

  mocks.policy.mockReturnValue(builder);
  mocks.bind.mockReturnValue(builder);
  mocks.done.mockReturnValue(request);
});

describe('ZK Identity account integration', () => {
  it('renders the official UI with the server-owned policy and a salted identifier', async () => {
    const screen = await renderSection(createApi());

    await expect.element(screen.getByText('Verify with zkPassport')).toBeInTheDocument();
    await expect.element(screen.getByText(/Verify your identity privately/)).toBeInTheDocument();
    await startVerification(screen);
    buildPolicyRequest();

    expect(mocks.props).toMatchObject({
      domain: 'comitium.co',
      mode: 'fast',
      name: 'Comitium',
      oprfKeyId: '1',
      theme: 'dark',
      uniqueIdentifierType: 1,
    });
    expect(mocks.policy).toHaveBeenCalledExactlyOnceWith('policy-1');
    expect(mocks.bind).toHaveBeenCalledExactlyOnceWith('custom_data', attempt.challenge);
  });

  it('submits the complete proof set to the API in canonical order', async () => {
    const api = createApi();
    const screen = await renderSection(api);
    const firstProof = { ...proof, index: 0, total: 2 };
    const secondProof = { ...proof, name: 'facematch', index: 1, total: 2 };

    await startVerification(screen);
    buildPolicyRequest();

    mocks.props?.onProofGenerated?.(secondProof);
    expect(api.completeZkIdentityAttempt).not.toHaveBeenCalled();
    mocks.props?.onProofGenerated?.(firstProof);

    await vi.waitFor(() => {
      expect(api.completeZkIdentityAttempt).toHaveBeenCalledWith(attempt.attemptId, {
        challenge: attempt.challenge,
        proofs: [firstProof, secondProof],
      });
    });
    await expect.element(screen.getByText('Verification complete')).toBeInTheDocument();
  });

  it('does not mix partial proof sets across an official UI retry', async () => {
    const api = createApi();
    const screen = await renderSection(api);

    await startVerification(screen);
    buildPolicyRequest();

    mocks.props?.onProofGenerated?.({ ...proof, name: 'stale-proof', total: 2 });
    mocks.props?.onRetryClicked?.();
    mocks.props?.onProofGenerated?.(proof);

    await vi.waitFor(() => {
      expect(api.completeZkIdentityAttempt).toHaveBeenCalledWith(attempt.attemptId, {
        challenge: attempt.challenge,
        proofs: [proof],
      });
    });
  });

  it('shows a terminal message when the identity is linked to another account', async () => {
    const api = createApi();
    vi.mocked(api.completeZkIdentityAttempt).mockResolvedValue({
      status: 'failed',
      failureCode: 'identity_already_linked',
    });
    const screen = await renderSection(api);

    await startVerification(screen);
    buildPolicyRequest();
    mocks.props?.onProofGenerated?.(proof);

    await expect.element(screen.getByText('Identity already verified')).toBeInTheDocument();
    await expect
      .element(
        screen.getByText('This ID is linked to another Comitium account. Sign in to that account or recover access.'),
      )
      .toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('discards the browser request when the verification dialog is closed', async () => {
    const api = createApi();
    const screen = await renderSection(api);

    await startVerification(screen);
    await screen.getByRole('button', { name: 'Close' }).click();

    await expect.element(screen.getByLabelText('Official ZKPassport verification')).not.toBeInTheDocument();

    await startVerification(screen);
    expect(api.createZkIdentityAttempt).toHaveBeenCalledTimes(2);
  });
});
