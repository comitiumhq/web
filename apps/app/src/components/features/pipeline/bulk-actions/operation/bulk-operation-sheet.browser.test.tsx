import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import type { PipelineBulkTarget } from '../model';
import { BulkOperationSheet } from './bulk-operation-sheet';

const counts: BulkOperation['counts'] = {
  ready: 2,
  excluded: 1,
  pending: 0,
  processing: 0,
  waiting: 0,
  succeeded: 0,
  skipped: 0,
  failed: 0,
};

const operation: BulkOperation = {
  id: 'operation-1',
  operationType: 'application.archive',
  operationVersion: 1,
  targetType: 'application',
  status: 'draft',
  targetCount: 3,
  parameters: null,
  committedAt: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-08-30T20:00:00.000Z',
  updatedAt: '2026-08-30T20:00:00.000Z',
  counts,
  items: [],
};

type TargetStatus = 'ready' | 'excluded' | 'skipped' | 'failed';

function target(id: string, status: TargetStatus): PipelineBulkTarget {
  const application = {
    applicationId: `application-${id}`,
    candidateId: null,
    jobId: null,
    jobTitle: null,
    requiresEmail: false,
    childOperationId: null,
    recipientPublicKey: null,
    deliveryGrant: null,
  };
  const { exclusion, error } = targetIssue(status);

  return {
    item: {
      id,
      ordinal: Number(id.at(-1)),
      selectedTargetId: application.applicationId,
      status,
      exclusion,
      error,
      application,
      completedAt: null,
    },
    application,
    pipelineApplication: null,
    profile: null,
  };
}

function targetIssue(status: TargetStatus): Pick<PipelineBulkTarget['item'], 'exclusion' | 'error'> {
  if (status === 'excluded') {
    return { exclusion: { code: 'not_eligible', message: 'Already archived.' }, error: null };
  }

  if (status === 'skipped') {
    return { exclusion: null, error: { code: 'target_changed', message: 'Application changed before processing.' } };
  }

  if (status === 'failed') {
    return { exclusion: null, error: { code: 'provider_error', message: 'The action was rejected.' } };
  }

  return { exclusion: null, error: null };
}

describe('BulkOperationSheet', () => {
  it('keeps readiness neutral and warns only about excluded applications', async () => {
    const screen = await render(
      <BulkOperationSheet
        open
        onOpenChange={vi.fn()}
        title="Archive selected applications"
        operation={operation}
        targets={[target('item-1', 'ready'), target('item-2', 'ready'), target('item-3', 'excluded')]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        submitLabel="Archive 2"
        pendingLabel="Starting…"
        submitting={false}
        destructive
        onSubmit={vi.fn()}
      />,
    );

    await expect.element(screen.getByText('2 ready')).not.toBeInTheDocument();
    await expect.element(screen.getByText('1 application will be skipped')).toBeInTheDocument();
    await expect.element(screen.getByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert').element()).toHaveClass('bg-warning/10');
    await expect.element(screen.getByRole('button', { name: 'Archive 2' })).toBeEnabled();
  });

  it('explains that accepted work continues when the sheet closes', async () => {
    const running: BulkOperation = {
      ...operation,
      status: 'running',
      committedAt: '2026-08-30T20:00:30.000Z',
      startedAt: '2026-08-30T20:00:30.000Z',
      counts: { ...counts, ready: 0, excluded: 0, processing: 3 },
    };
    const screen = await render(
      <BulkOperationSheet
        open
        onOpenChange={vi.fn()}
        title="Archive selected applications"
        operation={running}
        targets={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        submitLabel="Archive"
        pendingLabel="Starting…"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await expect.element(screen.getByText('Processing on the server')).toBeInTheDocument();
    await expect.element(screen.getByText('You can close this panel. The action will continue.')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Close' }).first()).toBeInTheDocument();
  });

  it('shows completed-with-errors as a warning when applications were skipped without failures', async () => {
    const completedWithErrors: BulkOperation = {
      ...operation,
      status: 'completed_with_errors',
      committedAt: '2026-08-30T20:00:30.000Z',
      startedAt: '2026-08-30T20:00:30.000Z',
      completedAt: '2026-08-30T20:01:00.000Z',
      counts: { ...counts, ready: 0, succeeded: 2 },
    };
    const screen = await render(
      <BulkOperationSheet
        open
        onOpenChange={vi.fn()}
        title="Archive selected applications"
        operation={completedWithErrors}
        targets={[target('item-1', 'excluded')]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        submitLabel="Archive"
        pendingLabel="Starting…"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await expect.element(screen.getByText('Completed with errors')).toBeInTheDocument();
    await expect.element(screen.getByText('2 completed · 1 skipped')).toBeInTheDocument();
    expect(screen.getByRole('alert').element()).toHaveClass('bg-warning/10');
    await expect.element(screen.getByText('0 failed')).not.toBeInTheDocument();
  });

  it('shows the affected application and reason for every non-successful terminal item', async () => {
    const completedWithErrors: BulkOperation = {
      ...operation,
      status: 'completed_with_errors',
      committedAt: '2026-08-30T20:00:30.000Z',
      startedAt: '2026-08-30T20:00:30.000Z',
      completedAt: '2026-08-30T20:01:00.000Z',
      counts: { ...counts, ready: 0, skipped: 1, failed: 1 },
    };
    const screen = await render(
      <BulkOperationSheet
        open
        onOpenChange={vi.fn()}
        title="Archive selected applications"
        operation={completedWithErrors}
        targets={[target('item-1', 'excluded'), target('item-2', 'skipped'), target('item-3', 'failed')]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        submitLabel="Archive"
        pendingLabel="Starting…"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );

    await expect.element(screen.getByText('Already archived.')).toBeInTheDocument();
    await expect.element(screen.getByText('Application changed before processing.')).toBeInTheDocument();
    await expect.element(screen.getByText('The action was rejected.')).toBeInTheDocument();
  });
});
