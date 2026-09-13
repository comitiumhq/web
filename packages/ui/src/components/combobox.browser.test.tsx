import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Combobox } from './combobox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

function SingleComboboxHarness() {
  const [value, setValue] = useState<string | null>(null);

  return (
    <Combobox
      ariaLabel="Template"
      options={[
        { value: 'product', label: 'Product interview' },
        { value: 'security', label: 'Security interview' },
      ]}
      value={value}
      onValueChange={setValue}
      placeholder="Select a template"
      searchPlaceholder="Search templates…"
    />
  );
}

function RequiredSingleComboboxHarness() {
  const [value, setValue] = useState('all');

  return (
    <Combobox
      ariaLabel="Department"
      options={[
        { value: 'all', label: 'All departments' },
        { value: 'engineering', label: 'Engineering' },
      ]}
      value={value}
      clearable={false}
      onValueChange={(nextValue) => {
        if (nextValue) {
          setValue(nextValue);
        }
      }}
      placeholder="All departments"
      searchPlaceholder="Search departments…"
    />
  );
}

function DialogComboboxHarness() {
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent style={{ display: 'grid', gap: 24 }}>
        <DialogTitle>Choose a template</DialogTitle>
        <DialogDescription>Select the template used for this message.</DialogDescription>
        <SingleComboboxHarness />
      </DialogContent>
    </Dialog>
  );
}

function ControlledComboboxHarness() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  return (
    <Combobox
      ariaLabel="Tag"
      options={[{ value: 'priority', label: 'Priority' }]}
      value={value}
      onValueChange={setValue}
      placeholder="Add tag"
      searchPlaceholder="Search tags…"
      open={open}
      onOpenChange={setOpen}
      closeOnSelect={false}
      footer={
        <button type="button" onClick={() => setOpen(false)}>
          Complete save
        </button>
      }
    />
  );
}

function GroupedComboboxHarness() {
  const [value, setValue] = useState<string | null>(null);

  return (
    <Combobox
      ariaLabel="Reason"
      options={[
        { value: 'candidate', label: 'Candidate withdrew', group: 'Candidate' },
        { value: 'company', label: 'Position closed', group: 'Company' },
      ]}
      value={value}
      onValueChange={setValue}
      placeholder="Select a reason"
      searchPlaceholder="Search reasons…"
      listFooter={<span>Load more reasons</span>}
    />
  );
}

describe('Combobox', () => {
  it('filters a single-select list and closes after selection', async () => {
    const screen = await render(<SingleComboboxHarness />);

    await screen.getByRole('button', { name: 'Show template options' }).click();
    await screen.getByRole('combobox', { name: 'Template' }).fill('security');
    await expect.element(screen.getByText('Security interview')).toBeVisible();
    await expect.element(screen.getByText('Product interview')).not.toBeInTheDocument();

    await screen.getByText('Security interview').click();
    await expect.element(screen.getByRole('combobox', { name: 'Template' })).toHaveValue('Security interview');
    await expect.element(screen.getByRole('option', { name: 'Security interview' })).not.toBeInTheDocument();
  });

  it('lets a required single-select clear its search query without clearing the selection', async () => {
    const screen = await render(<RequiredSingleComboboxHarness />);
    const input = screen.getByRole('combobox', { name: 'Department' });

    await screen.getByRole('button', { name: 'Show department options' }).click();
    await input.fill('');

    await expect.element(input).toHaveValue('');
    await expect.element(screen.getByRole('option', { name: 'All departments' })).toBeVisible();

    await input.fill('engineering');
    await screen.getByRole('option', { name: 'Engineering' }).click();

    await expect.element(input).toHaveValue('Engineering');

    await screen.getByRole('button', { name: 'Show department options' }).click();
    await input.fill('');

    await userEvent.keyboard('{Escape}');

    await expect.element(input).toHaveValue('Engineering');
  });

  it('keeps the dialog layout stable and closes only the options popup on Escape', async () => {
    const screen = await render(<DialogComboboxHarness />);
    const dialog = screen.getByRole('dialog').element();

    await Promise.all(dialog.getAnimations().map((animation) => animation.finished));

    const closedRect = dialog.getBoundingClientRect();

    await screen.getByRole('button', { name: 'Show template options' }).click();
    await expect.element(screen.getByRole('option', { name: 'Product interview' })).toBeVisible();

    const openRect = dialog.getBoundingClientRect();

    expect(openRect.height).toBeCloseTo(closedRect.height, 1);
    expect(openRect.top).toBeCloseTo(closedRect.top, 1);

    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('option', { name: 'Product interview' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('dialog')).toBeVisible();
  });

  it('can keep a controlled single-select popup open until an async action completes', async () => {
    const screen = await render(<ControlledComboboxHarness />);

    await screen.getByRole('button', { name: 'Show tag options' }).click();
    await screen.getByRole('option', { name: 'Priority' }).click();

    await expect.element(screen.getByRole('option', { name: 'Priority' })).toBeVisible();

    await screen.getByRole('button', { name: 'Complete save' }).click();

    await expect.element(screen.getByRole('option', { name: 'Priority' })).not.toBeInTheDocument();
  });

  it('renders grouped options with accessible group labels', async () => {
    const screen = await render(<GroupedComboboxHarness />);

    await screen.getByRole('button', { name: 'Show reason options' }).click();

    await expect.element(screen.getByRole('group', { name: 'Candidate' })).toBeVisible();
    await expect.element(screen.getByRole('group', { name: 'Company' })).toBeVisible();
    await expect.element(screen.getByRole('option', { name: 'Candidate withdrew' })).toBeVisible();
    await expect.element(screen.getByRole('option', { name: 'Position closed' })).toBeVisible();

    const listbox = screen.getByRole('listbox').element();
    const listFooter = screen.getByText('Load more reasons').element();

    expect(listbox.contains(listFooter)).toBe(true);
  });
});
