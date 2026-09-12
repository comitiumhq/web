import type { DuplicateApplicationAttempt, OtherApplicationSummary } from '@comitium/schemas/applications';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsiderationSelector } from './consideration-selector';

const currentApplication: OtherApplicationSummary = {
  id: 'application-1',
  jobId: 'job-1',
  jobOnChainId: 1,
  jobTitle: 'Senior Engineer',
  appliedAt: '2026-09-12T10:00:00.000Z',
  currentStageId: 'stage-1',
  currentStageName: 'Interview',
  terminalOutcome: null,
  terminalOutcomeAt: null,
  isResponded: true,
  archivedAt: null,
  duplicateAttemptCount: 1,
};

const duplicateAttempt = {
  id: '11111111-1111-4111-8111-111111111111',
  terminalOutcome: null,
  isResponded: true,
} as DuplicateApplicationAttempt;

describe('ConsiderationSelector', () => {
  it('searches grouped applications and selects an additional attempt', async () => {
    const onConsiderationChange = vi.fn();
    const onDuplicateAttemptChange = vi.fn();
    const screen = await render(
      <ConsiderationSelector
        currentApplicationId={currentApplication.id}
        considerations={[currentApplication]}
        duplicateAttempts={[duplicateAttempt]}
        totalDuplicateAttempts={1}
        isInitialLoading={false}
        isInitialError={false}
        isRetrying={false}
        hasNextConsiderationsPage={false}
        isFetchingNextConsiderationsPage={false}
        isFetchNextConsiderationsPageError={false}
        hasNextDuplicateAttemptsPage={false}
        isFetchingNextDuplicateAttemptsPage={false}
        isFetchNextDuplicateAttemptsPageError={false}
        isInitialDuplicateAttemptsLoading={false}
        isInitialDuplicateAttemptsError={false}
        isRetryingDuplicateAttempts={false}
        onConsiderationChange={onConsiderationChange}
        onDuplicateAttemptChange={onDuplicateAttemptChange}
        onLoadMoreConsiderations={vi.fn()}
        onRetryConsiderations={vi.fn()}
        onLoadMoreDuplicateAttempts={vi.fn()}
        onRetryDuplicateAttempts={vi.fn()}
      />,
    );

    await screen.getByRole('button', { name: 'Show application options' }).click();

    await expect.element(screen.getByRole('group', { name: 'Applications' })).toBeVisible();
    await expect.element(screen.getByRole('group', { name: 'Additional attempts (1)' })).toBeVisible();

    await screen.getByRole('combobox', { name: 'Application' }).fill('responded');

    await expect.element(screen.getByRole('option', { name: 'Application attempt · Responded' })).toBeVisible();
    await expect.element(screen.getByRole('option', { name: 'Senior Engineer · Interview' })).not.toBeInTheDocument();

    await screen.getByRole('option', { name: 'Application attempt · Responded' }).click();

    expect(onDuplicateAttemptChange).toHaveBeenCalledExactlyOnceWith(duplicateAttempt.id);
    expect(onConsiderationChange).not.toHaveBeenCalled();
  });
});
