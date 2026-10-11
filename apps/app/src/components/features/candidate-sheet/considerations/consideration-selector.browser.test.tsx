import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsiderationSelector } from './consideration-selector';

const currentApplication: OtherApplicationSummary = {
  id: 'application-1',
  jobId: 'job-1',
  jobTitle: 'Senior Engineer',
  appliedAt: '2026-09-12T10:00:00.000Z',
  currentStageId: 'stage-1',
  currentStageName: 'Interview',
  terminalOutcome: null,
  terminalOutcomeAt: null,
  archivedAt: null,
};

describe('ConsiderationSelector', () => {
  it('searches and selects a consideration', async () => {
    const onConsiderationChange = vi.fn();
    const screen = await render(
      <ConsiderationSelector
        currentApplicationId="other"
        considerations={[currentApplication]}
        isInitialLoading={false}
        isInitialError={false}
        isRetrying={false}
        hasNextConsiderationsPage={false}
        isFetchingNextConsiderationsPage={false}
        isFetchNextConsiderationsPageError={false}
        onConsiderationChange={onConsiderationChange}
        onLoadMoreConsiderations={vi.fn()}
        onRetryConsiderations={vi.fn()}
      />,
    );

    await screen.getByRole('button', { name: 'Show application options' }).click();
    await screen.getByRole('combobox', { name: 'Application' }).fill('Senior Engineer');
    await screen.getByRole('option', { name: 'Senior Engineer · Interview' }).click();
    expect(onConsiderationChange).toHaveBeenCalledExactlyOnceWith(currentApplication.id);
  });
});
