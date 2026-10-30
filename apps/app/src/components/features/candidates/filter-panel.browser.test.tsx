import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { CandidateFilterPanel } from './filter-panel';
import type { CandidateFilter } from './filters';

const mocks = vi.hoisted(() => ({ options: vi.fn() }));
vi.mock('@/lib/api/candidate-search', () => ({ getCandidateFilterOptions: mocks.options }));
vi.mock('@/hooks/use-candidate-tags', () => ({ useCandidateTags: () => ({ tags: [], error: null }) }));
afterEach(() => vi.resetAllMocks());

interface FilterHarnessProps {
  onApply: (filters: CandidateFilter[]) => void;
}

function FilterHarness({ onApply }: FilterHarnessProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<CandidateFilter[]>([]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Filters
      </button>
      <output aria-label="Applied conditions">{filters.length}</output>
      <CandidateFilterPanel
        orgId="org-1"
        open={open}
        onOpenChange={setOpen}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          onApply(next);
        }}
      />
    </>
  );
}

describe('Candidate filter panel', () => {
  it('loads metadata only on opening a selector and shares pending reads across closing and StrictMode', async () => {
    const response = Promise.withResolvers<unknown>();
    mocks.options.mockReturnValue(response.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <FilterHarness onApply={vi.fn()} />
        </QueryClientProvider>
      </StrictMode>,
    );

    await page.getByRole('button', { name: 'Filters', exact: true }).click();

    expect(mocks.options).not.toHaveBeenCalled();
    await expect.element(page.getByRole('combobox', { name: 'Current stage', exact: true })).toBeDisabled();

    await page.getByRole('combobox', { name: 'Job', exact: true }).click();
    await vi.waitFor(() => expect(mocks.options).toHaveBeenCalledOnce());
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Job', exact: true }).click();

    expect(mocks.options).toHaveBeenCalledOnce();
    expect(mocks.options.mock.calls[0]).toHaveLength(2);

    response.resolve({ data: [{ id: 'job-1', label: 'Engineer' }], nextAfter: null });

    await expect.element(page.getByRole('option', { name: 'Engineer', exact: true })).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Job', exact: true }).click();

    await expect.element(page.getByRole('option', { name: 'Engineer', exact: true })).toBeVisible();
    expect(mocks.options).toHaveBeenCalledOnce();

    await page.unmount();
    client.clear();
  });

  it('batches categories, discards Cancel, and applies Reset without keeping empty conditions', async () => {
    mocks.options.mockResolvedValue({ data: [{ id: 'job-1', label: 'Engineer' }], nextAfter: null });
    const onApply = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <QueryClientProvider client={client}>
        <FilterHarness onApply={onApply} />
      </QueryClientProvider>,
    );

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Job', exact: true }).click();
    await page.getByRole('option', { name: 'Engineer', exact: true }).click();

    await expect
      .element(page.getByRole('option', { name: 'Engineer', exact: true }))
      .toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Escape}');

    await expect.element(page.getByRole('combobox', { name: 'Current stage', exact: true })).toBeEnabled();

    await page.getByRole('combobox', { name: 'Outcome', exact: true }).click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await userEvent.keyboard('{Escape}');

    expect(onApply).not.toHaveBeenCalled();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await expect.element(page.getByRole('status', { name: 'Applied conditions' })).toHaveTextContent('0');

    await page.getByRole('button', { name: 'Filters', exact: true }).click();

    await expect.element(page.getByRole('combobox', { name: 'Current stage', exact: true })).toBeDisabled();

    await page.getByRole('combobox', { name: 'Job', exact: true }).click();
    await page.getByRole('option', { name: 'Engineer', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('combobox', { name: 'Outcome', exact: true }).click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0][0]).toHaveLength(2);
    await expect.element(page.getByRole('status', { name: 'Applied conditions' })).toHaveTextContent('2');

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    expect(onApply).toHaveBeenLastCalledWith([]);

    await page.unmount();
    client.clear();
  });

  it('loads more options and retains selected labels when searching another page', async () => {
    mocks.options.mockImplementation(async (_orgId, input) => {
      if (input.search) {
        return { data: [{ id: 'job-other', label: 'Other job' }], nextAfter: null };
      }

      if (input.after) {
        return { data: [{ id: 'job-last', label: 'Last job' }], nextAfter: null };
      }

      return {
        data: Array.from({ length: 40 }, (_, index) => ({ id: `job-${index}`, label: `Job ${index}` })),
        nextAfter: 'page-2',
      };
    });

    const onApply = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const page = await render(
      <QueryClientProvider client={client}>
        <FilterHarness onApply={onApply} />
      </QueryClientProvider>,
    );

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Job', exact: true }).click();

    await expect.element(page.getByRole('listbox')).toBeInTheDocument();

    const list = page.getByRole('listbox').element();
    Object.assign(list.style, { maxHeight: '256px', overflowY: 'auto', paddingBottom: '32px' });
    await page.getByRole('option', { name: 'Job 0', exact: true }).click();
    list.scrollTop = list.scrollHeight;
    list.dispatchEvent(new Event('scroll'));
    await page.getByRole('option', { name: 'Last job', exact: true }).click();
    await page.getByRole('combobox', { name: 'Search job', exact: true }).fill('Other');
    await page.getByRole('option', { name: 'Other job', exact: true }).click();
    await userEvent.keyboard('{Escape}');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();

    expect(onApply).toHaveBeenLastCalledWith([
      {
        field: 'job',
        choices: [
          { id: 'job-0', label: 'Job 0' },
          { id: 'job-last', label: 'Last job' },
          { id: 'job-other', label: 'Other job' },
        ],
      },
    ]);

    await page.unmount();
    client.clear();
  });
});
