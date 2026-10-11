import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { PipelineTab } from '../types';
import { ArchivedPipelineButton, StageTypeTabs } from './stage-type-tabs';

const counts = { lead: 0, review: 3, active: 4, offer: 1, hired: 2 };

function StageTabsHarness({ onTabChange }: { onTabChange: (tab: PipelineTab) => void }) {
  const [activeTab, setActiveTab] = useState<PipelineTab>('review');
  return (
    <StageTypeTabs
      counts={counts}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        onTabChange(tab);
      }}
    />
  );
}

describe('StageTypeTabs', () => {
  it('preserves stage counts, selected state, and tab changes', async () => {
    const onTabChange = vi.fn();
    const screen = await render(<StageTabsHarness onTabChange={onTabChange} />);

    await expect
      .element(screen.getByRole('tab', { name: 'Application review 3' }))
      .toHaveAttribute('aria-selected', 'true');
    await expect.element(screen.getByRole('tab', { name: 'Offer 1' })).toBeVisible();
    await expect.element(screen.getByRole('tab', { name: 'Hired 2' })).toBeVisible();
    await screen.getByRole('tab', { name: 'Active 4' }).click();

    await expect.element(screen.getByRole('tab', { name: 'Active 4' })).toHaveAttribute('aria-selected', 'true');
    expect(onTabChange).toHaveBeenCalledWith('active');
  });

  it('keeps archived selection separate from stage tabs', async () => {
    const onTabChange = vi.fn();
    const onArchivedClick = vi.fn();
    const screen = await render(
      <>
        <StageTypeTabs counts={counts} activeTab="archived" onTabChange={onTabChange} />
        <ArchivedPipelineButton count={6} active onClick={onArchivedClick} />
      </>,
    );

    expect(screen.getByRole('tab', { selected: true }).query()).toBeNull();
    await expect.element(screen.getByRole('button', { name: 'Archived 6' })).toHaveAttribute('aria-pressed', 'true');
    await screen.getByRole('button', { name: 'Archived 6' }).click();

    expect(onArchivedClick).toHaveBeenCalledOnce();
    expect(onTabChange).not.toHaveBeenCalled();
  });
});
