import { TooltipProvider } from '@comitium/ui/tooltip';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AutosaveStatus } from '@/components/features/editor-autosave/autosave-status';
import { useAutosave } from './use-autosave';

const INITIAL = { title: 'Engineer', plan: 'Original' };

function Editor({ save, enabled = true }: { save: (data: object) => Promise<unknown>; enabled?: boolean }) {
  const [data, setData] = useState(INITIAL);
  const version = useRef(1);
  const autosave = useAutosave({
    data,
    initialData: INITIAL,
    enabled,
    blockedKeys: data.title.trim() ? [] : ['title'],
    validationMessages: { title: ['Title is required'] },
    onSave: async (changes) => {
      await save({ ...changes, expectedVersion: version.current });

      version.current += 1;
    },
  });

  return (
    <>
      <label>
        Title
        <input
          value={data.title}
          onChange={(event) => setData((current) => ({ ...current, title: event.target.value }))}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          setData((current) => ({ ...current, plan: 'Engineering' }));
          autosave.saveImmediately();
        }}
      >
        Choose plan
      </button>
      <button type="button" onClick={() => void autosave.flush()}>
        Leave editor
      </button>
      <TooltipProvider>
        <AutosaveStatus autosave={autosave} />
      </TooltipProvider>
    </>
  );
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

describe('Editor autosave', () => {
  it('coalesces typing, serializes writes, and preserves newer input with the new version', async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const screen = await render(<Editor save={save} />);

    await screen.getByLabelText('Title').fill('Engineer I');
    await screen.getByLabelText('Title').fill('Engineer II');
    await expect.poll(() => save.mock.calls).toEqual([[{ title: 'Engineer II', expectedVersion: 1 }]]);
    await screen.getByLabelText('Title').fill('Engineer III');
    await screen.getByRole('button', { name: 'Choose plan' }).click();

    expect(save).toHaveBeenCalledOnce();
    first.resolve();
    await expect
      .poll(() => save.mock.calls)
      .toEqual([
        [{ title: 'Engineer II', expectedVersion: 1 }],
        [{ title: 'Engineer III', plan: 'Engineering', expectedVersion: 2 }],
      ]);

    await expect.element(screen.getByLabelText('Title')).toHaveValue('Engineer III');
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
  });

  it('saves a selected plan immediately while an invalid title stays local', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const screen = await render(<Editor save={save} />);

    await screen.getByLabelText('Title').fill('');
    await screen.getByRole('button', { name: 'Choose plan' }).click();
    await expect.poll(() => save.mock.calls).toEqual([[{ plan: 'Engineering', expectedVersion: 1 }]]);
    await expect.element(screen.getByRole('button', { name: 'Unsaved changes' })).toBeVisible();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('');
    await screen.getByLabelText('Title').fill('Designer');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await expect.poll(() => save.mock.calls.length).toBe(2);

    expect(save).toHaveBeenLastCalledWith({ title: 'Designer', expectedVersion: 2 });
  });

  it('keeps failed input, pauses requests, and retries the latest values explicitly', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Could not save')).mockResolvedValue(undefined);
    const screen = await render(<Editor save={save} />);

    await screen.getByLabelText('Title').fill('Engineer II');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await expect.element(screen.getByText('Could not save', { exact: true })).toBeVisible();
    await screen.getByLabelText('Title').fill('Engineer III');
    await screen.getByRole('button', { name: 'Leave editor' }).click();

    expect(save).toHaveBeenCalledOnce();
    await screen.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.poll(() => save.mock.calls.length).toBe(2);

    expect(save).toHaveBeenLastCalledWith({ title: 'Engineer III', expectedVersion: 1 });
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Engineer III');
  });

  it('retries a reverted value when the failed request may have reached the server', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue(undefined);
    const screen = await render(<Editor save={save} />);

    await screen.getByLabelText('Title').fill('Engineer II');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await expect.element(screen.getByText('Connection lost', { exact: true })).toBeVisible();
    await screen.getByLabelText('Title').fill('Engineer');
    await screen.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.poll(() => save.mock.calls.length).toBe(2);

    expect(save).toHaveBeenLastCalledWith({ title: 'Engineer', expectedVersion: 1 });
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
  });

  it('retains unconfirmed fields when a partial retry also fails', async () => {
    let serverData = { ...INITIAL };
    let attempts = 0;
    const save = vi.fn(async (changes: Partial<typeof INITIAL>) => {
      attempts += 1;

      if (attempts === 2) {
        throw new Error('Network unavailable');
      }

      serverData = {
        title: changes.title ?? serverData.title,
        plan: changes.plan ?? serverData.plan,
      };

      if (attempts === 1) {
        throw new Error('Connection lost');
      }
    });
    const screen = await render(<Editor save={save} />);

    await screen.getByLabelText('Title').fill('Engineer II');
    await screen.getByRole('button', { name: 'Choose plan' }).click();
    await expect.element(screen.getByText('Connection lost', { exact: true })).toBeVisible();

    expect(serverData).toEqual({ title: 'Engineer II', plan: 'Engineering' });

    await screen.getByLabelText('Title').fill('');
    await screen.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.element(screen.getByText('Network unavailable', { exact: true })).toBeVisible();

    expect(save).toHaveBeenLastCalledWith({ plan: 'Engineering', expectedVersion: 1 });

    await screen.getByLabelText('Title').fill('Engineer');
    await screen.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();

    expect(serverData).toEqual({ title: 'Engineer', plan: 'Engineering' });
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('does not persist defaults or changes in a read-only editor', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const screen = await render(<Editor save={save} enabled={false} />);

    await screen.getByRole('button', { name: 'Choose plan' }).click();
    await screen.getByRole('button', { name: 'Leave editor' }).click();

    expect(save).not.toHaveBeenCalled();
  });
});
