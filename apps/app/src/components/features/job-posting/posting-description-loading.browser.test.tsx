import { TooltipProvider } from '@comitium/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { JobPostingPage } from './job-posting-page';

const mocks = vi.hoisted(() => ({ update: vi.fn(), description: 'Persisted role description.', version: 1 }));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  useUpdateJobPosting: () => ({ mutateAsync: mocks.update }),
  usePublishJobPosting: () => ({ mutate: vi.fn() }),
  useUnpublishJobPosting: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/queries/use-query-job-summary', () => ({
  useQueryJobSummary: () => ({ data: { status: 'open', canonicalUrl: null } }),
}));
vi.mock('@/hooks/queries/use-query-job-posting', () => ({
  useQueryJobPosting: () => ({
    data: {
      id: 'posting',
      status: 'unpublished',
      version: mocks.version,
      applicationCapacity: 25,
      description: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: mocks.description }] }],
      },
      skills: [],
      form: null,
    },
  }),
}));
vi.mock('@/hooks/use-job-permissions', () => ({ useJobPermissions: () => ({ canOnJob: () => true }) }));
vi.mock('../editor-autosave/autosave-navigation-guard', () => ({ AutosaveNavigationGuard: () => null }));
vi.mock('../job-draft/application-form-picker', () => ({ ApplicationFormPicker: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.description = 'Persisted role description.';
  mocks.version = 1;
  mocks.update.mockResolvedValue({ version: 2 });
});

describe('Posting description initialization', () => {
  it('shows persisted rich text on the first opening without saving it again', async () => {
    const screen = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Persisted role description.', { exact: true })).toBeVisible();

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('preserves the edited document through saving and reopening', async () => {
    const screen = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Persisted role description.', { exact: true })).toBeVisible();

    const editable = screen.container.querySelector('[contenteditable="true"]');

    if (!editable) {
      throw new Error('Description editor is missing');
    }

    await page.elementLocator(editable).fill('Updated role description.');

    await expect
      .poll(() => mocks.update.mock.calls)
      .toEqual([
        [
          {
            description: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null },
                  content: [{ type: 'text', text: 'Updated role description.' }],
                },
              ],
            },
            expectedVersion: 1,
            skills: undefined,
          },
        ],
      ]);

    await expect.element(screen.getByText('Saved', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('Updated role description.', { exact: true })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
    await screen.unmount();

    mocks.description = 'Updated role description.';
    mocks.version = 2;

    const reopened = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(reopened.getByText('Updated role description.', { exact: true })).toBeVisible();

    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('shows a newer saved description when an untouched editor refreshes', async () => {
    const screen = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Persisted role description.', { exact: true })).toBeVisible();

    mocks.description = 'Updated by another editor.';
    mocks.version = 2;
    await screen.rerender(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Updated by another editor.', { exact: true })).toBeVisible();

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('keeps local text when a refresh races with an edit and the version check rejects it', async () => {
    mocks.update.mockRejectedValue(new Error('Posting version conflict — refresh and retry'));

    const screen = await render(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Persisted role description.', { exact: true })).toBeVisible();

    const editable = screen.container.querySelector('[contenteditable="true"]');

    if (!editable) {
      throw new Error('Description editor is missing');
    }

    await page.elementLocator(editable).fill('My unsaved description.');

    mocks.description = 'Updated by another editor.';
    mocks.version = 2;
    await screen.rerender(
      <TooltipProvider>
        <JobPostingPage orgId="org" jobId="job" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Changed elsewhere. Reload to continue.')).toBeVisible();
    await expect.element(screen.getByText('My unsaved description.', { exact: true })).toBeVisible();

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 1 }));
  });
});
