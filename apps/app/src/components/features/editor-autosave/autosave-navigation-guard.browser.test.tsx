import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useAutosave } from '@/hooks/use-autosave';
import { AutosaveNavigationGuard } from './autosave-navigation-guard';

const INITIAL = { title: 'Engineer' };
function Editor({ save, leave }: { save: (changes: object) => Promise<unknown>; leave: () => void }) {
  const [data, setData] = useState(INITIAL);
  const autosave = useAutosave({ data, initialData: INITIAL, blockedKeys: data.title ? [] : ['title'], onSave: save });

  return (
    <>
      <input aria-label="Title" value={data.title} onChange={(event) => setData({ title: event.target.value })} />
      <button type="button" onClick={leave}>
        Leave editor
      </button>
      <AutosaveNavigationGuard autosave={autosave} />
    </>
  );
}

function createEditorRouter(save: (changes: object) => Promise<unknown>) {
  const root = createRootRoute({ component: Outlet });
  const editor = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <Editor save={save} leave={() => void router.navigate({ to: '/login' })} />,
  });

  const done = createRoute({ getParentRoute: () => root, path: '/login', component: () => <h1>Done</h1> });
  const router = createRouter({
    routeTree: root.addChildren([editor, done]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return router;
}

describe('Autosave navigation', () => {
  it('flushes pending input before leaving without showing a discard dialog', async () => {
    let finish!: () => void;
    const save = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );

    const screen = await render(<RouterProvider router={createEditorRouter(save)} />);

    await screen.getByLabelText('Title').fill('Engineer II');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await expect.poll(() => save.mock.calls).toEqual([[{ title: 'Engineer II' }]]);
    await expect.element(screen.getByLabelText('Title')).toBeVisible();
    await expect.element(screen.getByRole('heading', { name: 'Leave without saving?' })).not.toBeInTheDocument();

    finish();
    await expect.element(screen.getByRole('heading', { name: 'Done' })).toBeVisible();
  });

  it('keeps invalid input until the user explicitly discards it', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const screen = await render(<RouterProvider router={createEditorRouter(save)} />);

    await screen.getByLabelText('Title').fill('');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Leave without saving?' })).toBeVisible();

    expect(save).not.toHaveBeenCalled();
    await screen.getByRole('button', { name: 'Keep editing' }).click();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('');
    await screen.getByRole('button', { name: 'Leave editor' }).click();
    await screen.getByRole('button', { name: 'Discard changes' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Done' })).toBeVisible();
  });
});
