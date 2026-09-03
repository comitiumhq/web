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
  it('adds multiple tags and removes an individual tag', async () => {
    const screen = await render(<Harness />);

    await screen.getByRole('combobox', { name: 'Add tag' }).click();
    await screen.getByText('Priority').click();
    await expect.element(screen.getByRole('button', { name: 'Remove tag Priority' })).toBeInTheDocument();

    await screen.getByRole('combobox', { name: 'Add tag' }).click();
    await screen.getByText('Referral').click();
    await expect.element(screen.getByRole('button', { name: 'Remove tag Referral' })).toBeInTheDocument();

    await screen.getByRole('button', { name: 'Remove tag Priority' }).click();
    await expect.element(screen.getByRole('button', { name: 'Remove tag Priority' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Remove tag Referral' })).toBeInTheDocument();
  });
});
