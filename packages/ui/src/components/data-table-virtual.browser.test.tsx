import type { ColumnDef, Row, RowSelectionState, SortingState } from '@tanstack/react-table';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { DataTableVirtual } from './data-table-virtual';

vi.mock('@tanstack/react-virtual', async () => {
  const { useEffect } = await import('react');

  return {
    useVirtualizer: (options: {
      count: number;
      onChange?: (instance: { getVirtualItems: () => { index: number; key: number; start: number }[] }) => void;
    }) => {
      const items = Array.from({ length: options.count }, (_, index) => ({ index, key: index, start: index * 64 }));
      const instance = {
        getVirtualItems: () => items,
        getTotalSize: () => options.count * 64,
        measureElement: () => undefined,
      };

      useEffect(() => {
        options.onChange?.(instance);
        options.onChange?.(instance);
      }, [options.count, options.onChange]);

      return instance;
    },
  };
});

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
    meta: { gridSize: '1fr' },
  },
];

const people = [
  { id: 'person-b', name: 'Bob' },
  { id: 'person-a', name: 'Alice' },
];

function SortableTable() {
  const [sorting, setSorting] = useState<SortingState>([]);

  return (
    <DataTableVirtual
      ariaLabel="People"
      columns={columns}
      data={people}
      getRowId={(person) => person.id}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  );
}

function SelectableTable({
  onRowClick = vi.fn<(row: Row<Person>) => void>(),
  maxSelectedRows,
}: {
  onRowClick?: (row: Row<Person>) => void;
  maxSelectedRows?: number;
}) {
  const [data, setData] = useState(people);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return (
    <>
      <button type="button" onClick={() => setData((current) => [...current, { id: 'person-c', name: 'Cara' }])}>
        Add person
      </button>
      <output aria-label="Selected row count">{Object.keys(rowSelection).length}</output>
      <DataTableVirtual
        ariaLabel="People"
        columns={columns}
        data={data}
        enableRowSelection
        getRowId={(person) => person.id}
        maxSelectedRows={maxSelectedRows}
        onRowClick={onRowClick}
        onRowSelectionChange={setRowSelection}
        rowSelection={rowSelection}
      />
    </>
  );
}

describe('DataTableVirtual', () => {
  it('applies controlled sorting and exposes the active direction accessibly', async () => {
    const screen = await render(<SortableTable />);

    const sortButton = screen.getByRole('button', { name: 'Name' });
    await sortButton.click();

    expect(sortButton.element().closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    const rows = screen.getByRole('row');
    await expect.element(rows.nth(1)).toHaveTextContent('Alice');
    await expect.element(rows.nth(2)).toHaveTextContent('Bob');
  });

  it('activates clickable rows from both keyboard activation keys', async () => {
    const onRowClick = vi.fn();
    const screen = await render(
      <DataTableVirtual
        ariaLabel="People"
        columns={columns}
        data={people}
        getRowId={(person) => person.id}
        onRowClick={onRowClick}
      />,
    );
    const bobRow = screen.getByRole('row', { name: 'Bob' });

    bobRow.element().focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick.mock.calls[0][0].original).toEqual(people[0]);
  });

  it('renders the provided empty state instead of an empty table shell', async () => {
    const screen = await render(
      <DataTableVirtual ariaLabel="People" columns={columns} data={[]} emptyState={<p>No people yet</p>} />,
    );

    await expect.element(screen.getByText('No people yet')).toBeInTheDocument();
    await expect.element(screen.getByRole('table')).not.toBeInTheDocument();
  });

  it('deduplicates repeated load-more observations for one in-flight request', async () => {
    const onLoadMore = vi.fn();
    await render(
      <DataTableVirtual
        ariaLabel="People"
        columns={columns}
        data={Array.from({ length: 12 }, (_, index) => ({ id: `person-${index}`, name: `Person ${index}` }))}
        hasNextPage
        onLoadMore={onLoadMore}
      />,
    );

    await vi.waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('selects a row without activating its row click and exposes the selected state', async () => {
    const onRowClick = vi.fn();
    const screen = await render(<SelectableTable onRowClick={onRowClick} />);

    await screen.getByRole('checkbox', { name: 'Select row 1' }).click();

    await expect.element(screen.getByLabelText('Selected row count')).toHaveTextContent('1');
    expect(screen.getByRole('row', { name: /Bob/ }).element()).toHaveAttribute('aria-selected', 'true');
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('selects only loaded rows and leaves rows loaded later unselected', async () => {
    const screen = await render(<SelectableTable />);
    const selectAll = screen.getByRole('checkbox', { name: 'Select all loaded rows' });

    await selectAll.click();
    await expect.element(screen.getByLabelText('Selected row count')).toHaveTextContent('2');

    await screen.getByRole('button', { name: 'Add person' }).click();

    await expect.element(screen.getByLabelText('Selected row count')).toHaveTextContent('2');
    expect(screen.getByRole('row', { name: /Cara/ }).element()).not.toHaveAttribute('aria-selected');
    await expect.element(selectAll).toBePartiallyChecked();
  });

  it('caps both header and individual selection at the configured maximum', async () => {
    const screen = await render(<SelectableTable maxSelectedRows={1} />);
    const selectUpToLimit = screen.getByRole('checkbox', { name: 'Select up to 1 loaded rows' });

    await selectUpToLimit.click();

    await expect.element(screen.getByLabelText('Selected row count')).toHaveTextContent('1');
    await expect.element(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeDisabled();

    await screen.getByRole('checkbox', { name: 'Select row 1' }).click();
    await screen.getByRole('checkbox', { name: 'Select row 2' }).click();

    await expect.element(screen.getByLabelText('Selected row count')).toHaveTextContent('1');
  });
});
