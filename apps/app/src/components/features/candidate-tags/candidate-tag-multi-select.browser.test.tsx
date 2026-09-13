import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { CandidateTagMultiSelect } from './candidate-tag-multi-select';

const options = [
  { value: 'tag-priority', label: 'Priority' },
  { value: 'tag-referral', label: 'Referral' },
];

function Harness() {
  const [tagIds, setTagIds] = useState<string[]>([]);

  return (
    <CandidateTagMultiSelect options={options} value={tagIds} placeholder="Select tags" onValueChange={setTagIds} />
  );
}

describe('CandidateTagMultiSelect', () => {
  it('keeps search in the popup and resets the filter after selection', async () => {
    const screen = await render(<Harness />);
    const trigger = screen.getByRole('combobox', { name: 'Tags' });

    await trigger.click();

    const searchInput = screen.getByPlaceholder('Search tags…');

    expect(searchInput.element().closest('[role="dialog"]')).not.toBeNull();

    await searchInput.fill('Priority');
    await screen.getByRole('option', { name: 'Priority' }).click();

    await expect.element(searchInput).toHaveValue('');
    await expect.element(screen.getByRole('option', { name: 'Referral' })).toBeVisible();
  });

  it('summarizes multiple tags and removes the visible tag', async () => {
    const screen = await render(<Harness />);

    await screen.getByRole('combobox', { name: 'Tags' }).click();
    await screen.getByText('Priority').click();
    await expect.element(screen.getByRole('button', { name: 'Remove Priority' })).toBeInTheDocument();

    await screen.getByText('Referral').click();
    await expect.element(screen.getByText('+1')).toBeInTheDocument();

    await screen.getByRole('button', { name: 'Remove Priority' }).click();
    await expect.element(screen.getByRole('button', { name: 'Remove Priority' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Remove Referral' })).toBeInTheDocument();
    await expect.element(screen.getByText('+1')).not.toBeInTheDocument();
  });
});
