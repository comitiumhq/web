import type { ColumnDef, Row, RowData, RowSelectionState, Table } from '@tanstack/react-table';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';

export function createDataTableSelectionColumn<TData extends RowData>(maxSelectedRows?: number): ColumnDef<TData> {
  return {
    id: '__selection',
    enableHiding: false,
    enableSorting: false,
    meta: {
      cellClassName: 'flex items-center justify-center overflow-visible px-2',
      gridSize: '2.75rem',
      headerClassName: 'flex items-center justify-center overflow-visible px-2',
      loadingCell: <Skeleton className="size-4 rounded-[6px]" />,
    },
    header: ({ table }) => <SelectionHeader table={table} maxSelectedRows={maxSelectedRows} />,
    cell: ({ row }) => <SelectionCell row={row} />,
  };
}

export function limitDataTableRowSelection<TData extends RowData>(
  enabled: boolean | ((row: Row<TData>) => boolean),
  maxSelectedRows: number | undefined,
  selectedRowCount: number,
) {
  if (!enabled || !maxSelectedRows) return enabled;

  return (row: Row<TData>) => {
    const allowed = typeof enabled === 'function' ? enabled(row) : true;
    return allowed && (row.getIsSelected() || selectedRowCount < maxSelectedRows);
  };
}

function SelectionHeader<TData extends RowData>({
  table,
  maxSelectedRows,
}: {
  table: Table<TData>;
  maxSelectedRows?: number;
}) {
  const selectableRows = table.getRowModel().rows.filter(canParticipateInSelection);
  const selectedRows = selectableRows.filter((row) => row.getIsSelected());

  const targetRows = getHeaderSelectionTargets(selectableRows, selectedRows, maxSelectedRows);
  const checked = getHeaderSelectionState(targetRows, selectedRows.length);
  const label = maxSelectedRows ? `Select up to ${maxSelectedRows} loaded rows` : 'Select all loaded rows';

  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      disabled={selectableRows.length === 0}
      onCheckedChange={(value) => table.setRowSelection(value === true ? selectionForRows(targetRows) : {})}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
    />
  );
}

function SelectionCell<TData extends RowData>({ row }: { row: Row<TData> }) {
  return (
    <Checkbox
      aria-label={`Select row ${row.index + 1}`}
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onCheckedChange={(value) => row.toggleSelected(value === true)}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
    />
  );
}

function canParticipateInSelection<TData extends RowData>(row: Row<TData>) {
  return row.getCanSelect() || row.getIsSelected();
}

function getHeaderSelectionTargets<TData extends RowData>(
  selectableRows: Row<TData>[],
  selectedRows: Row<TData>[],
  maxSelectedRows: number | undefined,
) {
  if (!maxSelectedRows) return selectableRows;

  const unselectedRows = selectableRows.filter((row) => !row.getIsSelected());
  return [...selectedRows, ...unselectedRows].slice(0, maxSelectedRows);
}

function getHeaderSelectionState<TData extends RowData>(
  targetRows: Row<TData>[],
  selectedRowCount: number,
): boolean | 'indeterminate' {
  const allTargetRowsSelected = targetRows.length > 0 && targetRows.every((row) => row.getIsSelected());

  if (allTargetRowsSelected) return true;
  if (selectedRowCount > 0) return 'indeterminate';

  return false;
}

function selectionForRows<TData extends RowData>(rows: Row<TData>[]): RowSelectionState {
  return Object.fromEntries(rows.map((row) => [row.id, true]));
}

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
