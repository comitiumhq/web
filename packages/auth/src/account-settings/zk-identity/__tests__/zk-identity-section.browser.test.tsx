import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProofResult } from '@zkpassport/sdk';
import { createOfflineQuery } from '@zkpassport/sdk/query';
import type { QueryBuilder, ZKPassportQRCodeProps } from '@zkpassport/ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ZkIdentityApi, ZkIdentityAttempt } from '../../../zk-identity';
import { ZkIdentitySection } from '../zk-identity-section';

const mocks = vi.hoisted(() => ({
  props: undefined as ZKPassportQRCodeProps | undefined,
  toastError: vi.fn(),
  toastInfo: vi.fn(),
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

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
  },
}));

const attempt: ZkIdentityAttempt = {
  attemptId: '019945cd-c640-7000-8000-000000000001',
  challenge: 'a'.repeat(64),
  request: {
    domain: 'comitium.co',
    oprfKeyId: '1',
    proofMode: 'fast',
    purpose: 'Link your identity document to your Comitium account.',
    query: {
      age: { gte: 18 },
      expiry_date: { disclose: true },
      facematch: { mode: 'strict' },
      sanctions: { countries: 'all', lists: 'all', strict: false },
    },
    scope: 'global-account',
  },
};

const proof = {
  proof: 'proof-bytes',
  vkeyHash: 'vkey-hash',
  version: '0.17.1',
  name: 'compare_age',
  index: 0,
  total: 1,
} satisfies ProofResult;

const disclosedResult = {
  expiry_date: { disclose: { result: new Date('2036-01-01T00:00:00Z') } },
};

const linkedDocument = {
  status: 'verified',
  verifiedAt: '2026-10-14T12:00:00Z',
  documentExpiresOn: '2036-01-01',
  canReplace: false,
} as const;

const expiredDocument = { ...linkedDocument, documentExpiresOn: '2020-06-01', canReplace: true };

function createApi(): ZkIdentityApi {
  return {
    completeZkIdentityAttempt: vi.fn().mockResolvedValue(linkedDocument),
    createZkIdentityAttempt: vi.fn().mockResolvedValue(attempt),
    getZkIdentityStatus: vi.fn().mockResolvedValue({ status: 'not_started' }),
  };
}

function renderSection(api: ZkIdentityApi) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <ZkIdentitySection api={api} queryKey={['account', 'zk-identity', 'product-user-1']} />
    </QueryClientProvider>,
  );
}

async function startVerification(screen: Awaited<ReturnType<typeof renderSection>>) {
  await screen.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect.element(screen.getByRole('dialog', { name: 'ZKPassport verification' })).toBeInTheDocument();
  await expect.element(screen.getByLabelText('Official ZKPassport verification')).toBeInTheDocument();
}

function buildRequest() {
  const props = mocks.props;

  if (!props) {
    throw new Error('ZKPassportQRCode was not rendered');
  }

  return props.query(createOfflineQuery() as unknown as QueryBuilder);
}

beforeEach(() => {
  mocks.toastError.mockReset();
  mocks.toastInfo.mockReset();
  mocks.props = undefined;
});

describe('ZK Identity account integration', () => {
  it('builds the server-issued query with the attempt challenge and a salted identifier', async () => {
    const screen = await renderSection(createApi());

    await expect.element(screen.getByText('Verify with zkPassport')).toBeInTheDocument();
    await expect
      .element(screen.getByText('A simple, secure way to verify your identity. Private by design.'))
      .toBeInTheDocument();
    await startVerification(screen);

    const request = await buildRequest();

    expect(mocks.props).toMatchObject({
      domain: 'comitium.co',
      mode: 'fast',
      name: 'Comitium',
      oprfKeyId: '1',
      purpose: attempt.request.purpose,
      scope: 'global-account',
      theme: 'dark',
      uniqueIdentifierType: 1,
    });
    expect(request.query).toEqual({
      ...attempt.request.query,
      bind: { custom_data: attempt.challenge },
    });
  });

  it('submits the proof bundle and disclosures once, then shows the server result', async () => {
    const api = createApi();
    const screen = await renderSection(api);
    const firstProof = { ...proof, index: 0, total: 2 };
    const secondProof = { ...proof, name: 'facematch', index: 1, total: 2 };

    await startVerification(screen);

    const onSuccess = mocks.props?.onSuccess;

    await onSuccess?.({ proofs: [secondProof, firstProof], result: disclosedResult });
    await onSuccess?.({ proofs: [secondProof, firstProof], result: disclosedResult });

    await vi.waitFor(() => {
      expect(api.completeZkIdentityAttempt).toHaveBeenCalledWith(attempt.attemptId, {
        challenge: attempt.challenge,
        proofs: [secondProof, firstProof],
        documentExpiresOn: '2036-01-01',
      });
    });
    expect(api.completeZkIdentityAttempt).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByText('Identity verified')).toBeInTheDocument();
  });

  it('does not submit missing expiry data', async () => {
    const api = createApi();
    const screen = await renderSection(api);

    await startVerification(screen);
    await mocks.props?.onSuccess?.({ proofs: [proof], result: {} });

    expect(api.completeZkIdentityAttempt).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it('shows a stable message for an SDK error', async () => {
    const screen = await renderSection(createApi());

    await startVerification(screen);
    mocks.props?.onError?.('The passport chip could not be read.');

    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith('Identity verification failed', {
      id: 'zk-identity-verification',
      description: 'The zkPassport app could not complete verification. Try again.',
    });
  });

  it('explains a document conflict and permits choosing another document', async () => {
    const api = createApi();

    vi.mocked(api.completeZkIdentityAttempt).mockResolvedValue({
      status: 'failed',
      failureCode: 'identity_already_linked',
    });

    const screen = await renderSection(api);

    await startVerification(screen);
    await mocks.props?.onSuccess?.({ proofs: [proof], result: disclosedResult });

    await expect.element(screen.getByRole('alert')).toHaveTextContent('This document is already linked to an account.');
    await expect.element(screen.getByRole('button', { name: 'Verify', exact: true })).toBeInTheDocument();
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

describe('Linked document display', () => {
  it('shows only the expiry for a valid document, with no replacement or support link', async () => {
    const api = createApi();

    vi.mocked(api.getZkIdentityStatus).mockResolvedValue(linkedDocument);

    const screen = await renderSection(api);

    await expect.element(screen.getByText('Identity verified')).toBeInTheDocument();
    await expect.element(screen.getByText('Document valid until Jan 1, 2036.')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Replace document' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: /support/i })).not.toBeInTheDocument();
  });

  it('offers replacement for an expired document and preserves it after a rejected attempt', async () => {
    const api = createApi();

    vi.mocked(api.getZkIdentityStatus).mockResolvedValue(expiredDocument);
    vi.mocked(api.completeZkIdentityAttempt).mockResolvedValue({ status: 'failed', failureCode: 'proof_invalid' });

    const screen = await renderSection(api);

    await expect.element(screen.getByText('Document expired')).toBeInTheDocument();
    await expect
      .element(screen.getByText('Expired on Jun 1, 2020. Link a new document to update your verification.'))
      .toBeInTheDocument();
    await screen.getByRole('button', { name: 'Replace document' }).click();
    await expect.element(screen.getByLabelText('Official ZKPassport verification')).toBeInTheDocument();
    await mocks.props?.onSuccess?.({ proofs: [proof], result: disclosedResult });

    await expect.element(screen.getByText('Document expired')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Replace document' })).toBeInTheDocument();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('The proof did not satisfy this verification request.');
  });

  it('shows the new expiry and removes replacement after a successful update', async () => {
    const api = createApi();

    vi.mocked(api.getZkIdentityStatus).mockResolvedValue(expiredDocument);

    const screen = await renderSection(api);

    await screen.getByRole('button', { name: 'Replace document' }).click();
    await expect.element(screen.getByLabelText('Official ZKPassport verification')).toBeInTheDocument();
    await mocks.props?.onSuccess?.({ proofs: [proof], result: disclosedResult });

    await expect.element(screen.getByText('Identity verified')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Replace document' })).not.toBeInTheDocument();
  });

  it('permits support-approved replacement before expiry', async () => {
    const api = createApi();

    vi.mocked(api.getZkIdentityStatus).mockResolvedValue({ ...linkedDocument, canReplace: true });

    const screen = await renderSection(api);

    await expect.element(screen.getByText('Identity verified')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Replace document' })).toBeInTheDocument();
  });
});
