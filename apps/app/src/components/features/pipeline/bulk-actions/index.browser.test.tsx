import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { BulkOperations } from './index';

const mocks = vi.hoisted(() => ({
  runUnlocked: vi.fn(),
}));

vi.mock('@/hooks/use-encryption-unlocked', () => ({
  useEncryptionUnlocked: () => ({ runUnlocked: mocks.runUnlocked }),
}));

vi.mock('./archive/bulk-archive-sheet', () => ({
  BulkArchiveSheet: ({ open }: { open: boolean }) => <div data-testid="archive-sheet" data-open={open} />,
}));
vi.mock('./email/bulk-email-sheet', () => ({
  BulkEmailSheet: ({ open, applicationIds }: { open: boolean; applicationIds: readonly string[] }) => (
    <div data-testid="email-sheet" data-open={open} data-application-ids={applicationIds.join(',')} />
  ),
}));
vi.mock('./candidate-tag/bulk-assign-candidate-tag-sheet', () => ({
  BulkAssignCandidateTagSheet: ({ open }: { open: boolean }) => <div data-testid="tags-sheet" data-open={open} />,
}));

beforeEach(() => {
  mocks.runUnlocked.mockReset();
  mocks.runUnlocked.mockImplementation(async (action: () => void) => action());
});

describe('BulkOperations', () => {
  it('opens an action for the current exact selection', async () => {
    const selected = [{ id: 'application-a' } as PipelineCandidate, { id: 'application-b' } as PipelineCandidate];
    const screen = await render(
      <BulkOperations
        activeTab="review"
        selectedApplications={selected}
        pipelineApplications={selected}
        namesMap={new Map()}
        orgId="org-bulk-operation-test"
        maxItems={10}
        onClear={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );

    await expect.element(screen.getByText('2 of 10 selected')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Email' }).click();
    await expect.element(screen.getByTestId('email-sheet')).toHaveAttribute('data-open', 'true');
    await expect
      .element(screen.getByTestId('email-sheet'))
      .toHaveAttribute('data-application-ids', 'application-a,application-b');
  });

  it('does not open any bulk action until encrypted organization data is unlocked', async () => {
    mocks.runUnlocked.mockResolvedValue(undefined);
    const selected = [{ id: 'application-a' } as PipelineCandidate];
    const screen = await render(
      <BulkOperations
        activeTab="review"
        selectedApplications={selected}
        pipelineApplications={selected}
        namesMap={new Map()}
        orgId="org-bulk-operation-test"
        maxItems={10}
        onClear={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );

    await screen.getByRole('button', { name: 'Tags' }).click();
    await screen.getByRole('button', { name: 'Email' }).click();
    await screen.getByRole('button', { name: 'Archive' }).click();

    expect(mocks.runUnlocked).toHaveBeenCalledTimes(3);
    await expect.element(screen.getByTestId('tags-sheet')).toHaveAttribute('data-open', 'false');
    await expect.element(screen.getByTestId('email-sheet')).toHaveAttribute('data-open', 'false');
    await expect.element(screen.getByTestId('archive-sheet')).toHaveAttribute('data-open', 'false');
  });
});
