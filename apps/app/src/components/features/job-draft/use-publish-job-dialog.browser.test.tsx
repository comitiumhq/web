import type { JobEconomicsConfig } from '@comitium/chain/job-economics';
import type { JobDraft } from '@comitium/schemas/jobs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { usePublishJobDialog } from './use-publish-job-dialog';

const jobConfig: JobEconomicsConfig = {
  version: 1,
  minStake: 100_000_000n,
  tierCount: 2,
  maxBatchSize: 100,
  maxUnpublishedDuration: 86_400,
  maxPublishedDuration: 2_592_000,
  feeTiers: [
    { index: 0, baseFee: 5_000_000n, feeBps: 100n, deadlineDays: 1 },
    { index: 1, baseFee: 10_000_000n, feeBps: 200n, deadlineDays: 7 },
  ],
};

const mocks = vi.hoisted(() => ({
  availableUsd: 1_000,
  config: null as JobEconomicsConfig | null,
  isConfigError: false,
  isConfigFetching: false,
  isConfigLoading: false,
  isConfirming: false,
  isPending: false,
  onOpenChange: vi.fn(),
  publishDraft: vi.fn(),
  refetchConfig: vi.fn(),
}));

vi.mock('@/hooks/queries/use-query-org', () => ({
  useQueryOrg: () => ({ data: { orgId: 7 }, isLoading: false }),
}));

vi.mock('@/hooks/queries/use-org-balance', () => ({
  useOrgBalance: () => ({ availableUsd: mocks.availableUsd, isLoading: false }),
}));

vi.mock('@/hooks/queries/use-query-job-config', () => ({
  useQueryJobConfig: () => ({
    data: mocks.config ?? undefined,
    isLoading: mocks.isConfigLoading,
    isFetching: mocks.isConfigFetching,
    isError: mocks.isConfigError,
    refetch: mocks.refetchConfig,
  }),
}));

vi.mock('@/hooks/mutations/use-publish-draft', () => ({
  usePublishDraft: () => ({
    mutate: mocks.publishDraft,
    isPending: mocks.isPending,
    isConfirming: mocks.isConfirming,
  }),
}));

function Harness() {
  const dialog = usePublishJobDialog({
    orgId: '11111111-1111-4111-8111-111111111111',
    jobId: '22222222-2222-4222-8222-222222222222',
    draft: { title: 'Backend engineer' } as JobDraft,
    expectedVersion: 4,
    descriptionMarkdown: 'Build reliable systems.',
    open: true,
    onOpenChange: mocks.onOpenChange,
  });

  return (
    <main>
      <p>Stake: {dialog.employerStake}</p>
      <p>Tier: {String(dialog.form.getValues('feeTier'))}</p>
      <p>{dialog.canSubmit ? 'Ready' : 'Blocked'}</p>
      <p>{dialog.isInsufficient ? 'Insufficient' : 'Funded'}</p>
      <button type="button" disabled={!dialog.canSubmit} onClick={() => dialog.handleSubmit(dialog.form.getValues())}>
        Publish
      </button>
      <button type="button" onClick={() => dialog.handleSubmit({ employerStake: 100, feeTier: 9 })}>
        Submit stale tier
      </button>
      <button type="button" onClick={dialog.handleRetryJobConfig}>
        Retry config
      </button>
    </main>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.availableUsd = 1_000;
  mocks.config = jobConfig;
  mocks.isConfigError = false;
  mocks.isConfigFetching = false;
  mocks.isConfigLoading = false;
  mocks.isConfirming = false;
  mocks.isPending = false;
});

describe('usePublishJobDialog', () => {
  it('synchronizes the minimum stake and seven-day default tier from current config', async () => {
    const screen = await render(<Harness />);

    await expect.element(screen.getByText('Stake: 100')).toBeInTheDocument();
    await expect.element(screen.getByText('Tier: 1')).toBeInTheDocument();
    await expect.element(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('blocks publishing when the organization cannot fund the complete cost', async () => {
    mocks.availableUsd = 100;
    const screen = await render(<Harness />);

    await expect.element(screen.getByText('Insufficient')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(mocks.publishDraft).not.toHaveBeenCalled();
  });

  it('rejects a stale fee tier before invoking the publish workflow', async () => {
    const screen = await render(<Harness />);

    await screen.getByRole('button', { name: 'Submit stale tier' }).click();

    expect(mocks.publishDraft).not.toHaveBeenCalled();
  });

  it('offers config retry and blocks submission while pricing is unavailable', async () => {
    mocks.config = null;
    mocks.isConfigError = true;
    const screen = await render(<Harness />);

    await expect.element(screen.getByText('Blocked')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Retry config' }).click();
    expect(mocks.refetchConfig).toHaveBeenCalledOnce();
  });

  it('blocks another publication while confirmation is active', async () => {
    mocks.isConfirming = true;
    const screen = await render(<Harness />);

    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
