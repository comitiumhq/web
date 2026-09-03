import { TagIcon } from '@phosphor-icons/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { TableSelectionDock } from './table-selection-dock';

describe('TableSelectionDock', () => {
  it('renders an accessible overlay toolbar with actions and clear control', async () => {
    const onAction = vi.fn();
    const onClear = vi.fn();
    const screen = await render(
      <TableSelectionDock
        selectedCount={3}
        actions={[{ id: 'tag', label: 'Tags', icon: TagIcon, onSelect: onAction }]}
        onClear={onClear}
      />,
    );

    await expect.element(screen.getByRole('toolbar', { name: 'Actions for selected rows' })).toBeVisible();
    await expect.element(screen.getByText('3 selected')).toBeVisible();

    await screen.getByRole('button', { name: 'Tags' }).click();
    await screen.getByRole('button', { name: 'Clear selection' }).click();

    expect(onAction).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not render when the selection is empty', async () => {
    const screen = await render(<TableSelectionDock selectedCount={0} actions={[]} onClear={vi.fn()} />);

    await expect.element(screen.getByRole('toolbar')).not.toBeInTheDocument();
  });
});
