import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { PublishPostingDialog } from './publish-posting-dialog';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  onOpenChange: vi.fn(),
  publish: vi.fn(),
  posting: {
    applicationCapacity: 25 as number | null,
    descriptionMarkdown: 'Build reliable systems.',
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    version: 4,
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/queries/use-query-job-posting', () => ({
  useQueryJobPosting: () => ({
    data: mocks.posting,
    isError: false,
    isFetching: false,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/mutations/use-job-posting-mutations', () => ({
  usePublishJobPosting: () => ({
    isPending: false,
    mutateAsync: mocks.publish,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.posting = {
    applicationCapacity: 25,
    descriptionMarkdown: 'Build reliable systems.',
    form: { id: 'form-1', title: 'Default Application Form', isArchived: false },
    version: 4,
  };
  mocks.publish.mockResolvedValue(undefined);
  mocks.navigate.mockResolvedValue(undefined);
});

describe('PublishPostingDialog', () => {
  it('publishes the Posting and capacity as one action', async () => {
    const screen = await render(
      <PublishPostingDialog
        orgId="org-1"
        jobId="job-1"
        jobTitle="Backend engineer"
        open
        onOpenChange={mocks.onOpenChange}
      />,
    );

    await expect.element(screen.getByText('Default Application Form')).toBeInTheDocument();
    await expect.element(screen.getByLabelText('Maximum applications')).toHaveValue(25);
    await screen.getByRole('button', { name: 'Publish' }).click();

    await vi.waitFor(() => {
      expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({
        expectedVersion: 4,
        applicationCapacity: 25,
      });
    });
    expect(mocks.onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/org/$orgId/jobs/$jobId/posting',
      params: { orgId: 'org-1', jobId: 'job-1' },
    });
  });

  it('blocks publishing with an archived Application Form', async () => {
    mocks.posting = {
      ...mocks.posting,
      form: { ...mocks.posting.form, isArchived: true },
    };
    const screen = await render(
      <PublishPostingDialog
        orgId="org-1"
        jobId="job-1"
        jobTitle="Backend engineer"
        open
        onOpenChange={mocks.onOpenChange}
      />,
    );

    await expect
      .element(screen.getByText('Choose an active Application Form in the Job editor before publishing.'))
      .toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
