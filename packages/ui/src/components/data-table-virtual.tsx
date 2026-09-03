import { ArrowDownIcon, ArrowsDownUpIcon, ArrowUpIcon } from '@phosphor-icons/react';
import {
  type Cell,
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Header,
  type OnChangeFn,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import {
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { cn } from '../lib/cn';
import { Card } from './card';
import { createDataTableSelectionColumn, limitDataTableRowSelection } from './data-table-selection';
import { Skeleton } from './skeleton';

declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: TanStack module augmentation must match upstream generic names.
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string;
    gridSize?: string;
    headerClassName?: string;
    label?: string;
    loadingCell?: ReactNode;
    skeletonClassName?: string;
  }
}

const DEFAULT_ROW_ESTIMATE_PX = 64;
const DEFAULT_OVERSCAN = 10;
const DEFAULT_LOADING_ROWS = 3;
const LOAD_AHEAD_ROWS = 8;
const DATA_TABLE_CARD_CLASS = 'overflow-hidden border border-border py-0 ring-0';
const EMPTY_ROW_SELECTION: RowSelectionState = {};

export interface DataTableVirtualProps<TData extends RowData> extends Omit<ComponentProps<typeof Card>, 'children'> {
  ariaLabel: string;
  columns: ColumnDef<TData>[];
  data: TData[];
  columnVisibility?: VisibilityState;
  emptyState?: ReactNode;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  gridMinWidth?: string;
  hasNextPage?: boolean;
  loadingMore?: boolean;
  loadingMoreRowCount?: number;
  manualSorting?: boolean;
  maxSelectedRows?: number;
  enableSortingRemoval?: boolean;
  maxHeightClassName?: string;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  onLoadMore?: () => void;
  onRowClick?: (row: Row<TData>) => void;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onSortingChange?: OnChangeFn<SortingState>;
  overscan?: number;
  rowEstimatePx?: number;
  rowSelection?: RowSelectionState;
  sorting?: SortingState;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
}

type SortDirection = false | 'asc' | 'desc';

export function DataTableVirtual<TData extends RowData>({
  ariaLabel,
  className,
  columns,
  columnVisibility,
  data,
  emptyState,
  getRowClassName,
  getRowId,
  gridMinWidth,
  hasNextPage,
  loadingMore,
  loadingMoreRowCount = DEFAULT_LOADING_ROWS,
  manualSorting = false,
  maxSelectedRows,
  enableSortingRemoval = true,
  maxHeightClassName = 'max-h-[calc(100vh-14rem)]',
  onColumnVisibilityChange,
  onLoadMore,
  onRowClick,
  onRowSelectionChange,
  onSortingChange,
  overscan = DEFAULT_OVERSCAN,
  rowEstimatePx = DEFAULT_ROW_ESTIMATE_PX,
  rowSelection,
  sorting,
  enableRowSelection = false,
  ...cardProps
}: DataTableVirtualProps<TData>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreInFlight = useRef(false);
  const selectedRowCount = countSelectedRows(rowSelection);

  const limitedRowSelection = useMemo<NonNullable<typeof enableRowSelection>>(() => {
    return limitDataTableRowSelection(enableRowSelection, maxSelectedRows, selectedRowCount);
  }, [enableRowSelection, maxSelectedRows, selectedRowCount]);

  const tableColumns = useMemo(
    () => (enableRowSelection ? [createDataTableSelectionColumn<TData>(maxSelectedRows), ...columns] : columns),
    [columns, enableRowSelection, maxSelectedRows],
  );

  const tableState = useMemo(
    () => ({ columnVisibility, rowSelection: rowSelection ?? EMPTY_ROW_SELECTION, sorting }),
    [columnVisibility, rowSelection, sorting],
  );

  const table = useReactTable({
    columns: tableColumns,
    data,
    defaultColumn: { enableSorting: false },
    enableRowSelection: limitedRowSelection,
    enableSortingRemoval,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    onColumnVisibilityChange,
    onRowSelectionChange,
    onSortingChange,
    state: tableState,
  });

  const rows = table.getRowModel().rows;
  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  const gridTemplateColumns = useMemo(
    () => getGridTemplateColumns(table.getVisibleLeafColumns()),
    [table, tableColumns, columnVisibility],
  );

  const rowCount = rows.length + (loadingMore ? loadingMoreRowCount : 0);

  const getItemKey = useCallback((index: number) => rows[index]?.id ?? `loading-${index - rows.length}`, [rows]);

  const handleVirtualizerChange = useCallback(
    (instance: Virtualizer<HTMLDivElement, HTMLTableRowElement>) => {
      if (!onLoadMore || !hasNextPage || loadingMore || loadMoreInFlight.current) {
        return;
      }

      const items = instance.getVirtualItems();
      const lastIndex = items.length > 0 ? items[items.length - 1].index : -1;

      if (lastIndex < rows.length - 1 - LOAD_AHEAD_ROWS) {
        return;
      }

      loadMoreInFlight.current = true;
      onLoadMore();
    },
    [hasNextPage, loadingMore, onLoadMore, rows.length],
  );

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rowCount,
    estimateSize: () => rowEstimatePx,
    getItemKey,
    getScrollElement: () => scrollRef.current,
    onChange: handleVirtualizerChange,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const innerStyle = useMemo<CSSProperties | undefined>(
    () => (gridMinWidth ? { minWidth: gridMinWidth } : undefined),
    [gridMinWidth],
  );

  const bodyStyle = useMemo<CSSProperties>(() => ({ height: totalSize }), [totalSize]);

  useEffect(() => {
    if (!loadingMore) {
      loadMoreInFlight.current = false;
    }
  }, [loadingMore]);

  if (rows.length === 0 && !loadingMore && emptyState) {
    return (
      <Card
        {...cardProps}
        data-slot="data-table"
        className={cn(DATA_TABLE_CARD_CLASS, 'min-h-0 flex-1 justify-center', className)}
      >
        {emptyState}
      </Card>
    );
  }

  return (
    <Card {...cardProps} data-slot="data-table" className={cn(DATA_TABLE_CARD_CLASS, className)}>
      <div
        ref={scrollRef}
        data-slot="data-table-scroll-area"
        className={cn('overflow-auto [overflow-anchor:none] [scrollbar-gutter:stable]', maxHeightClassName)}
      >
        <table aria-label={ariaLabel} className="grid w-full" style={innerStyle}>
          <thead className="sticky top-0 z-10 grid bg-muted shadow-[0_1px_0_0_var(--border)]">
            <tr className="grid min-h-11 items-center" style={{ gridTemplateColumns }}>
              {headers.map((header) => (
                <HeaderCell key={header.id} header={header} />
              ))}
            </tr>
          </thead>

          <tbody className="relative grid" style={bodyStyle}>
            {virtualItems.map((item) => {
              const row = rows[item.index];

              if (row) {
                return (
                  <DataRow
                    key={item.key}
                    row={row}
                    visibleCells={row.getVisibleCells()}
                    start={item.start}
                    virtualIndex={item.index}
                    gridTemplateColumns={gridTemplateColumns}
                    showBottomBorder={item.index < rowCount - 1}
                    rowClassName={getRowClassName?.(row)}
                    selected={row.getIsSelected()}
                    measureElement={virtualizer.measureElement}
                    onRowClick={onRowClick}
                  />
                );
              }

              return (
                <LoadingRow
                  key={item.key}
                  headers={headers}
                  start={item.start}
                  virtualIndex={item.index}
                  gridTemplateColumns={gridTemplateColumns}
                  showBottomBorder={item.index < rowCount - 1}
                  measureElement={virtualizer.measureElement}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface DataRowProps<TData extends RowData> {
  row: Row<TData>;
  visibleCells: Cell<TData, unknown>[];
  start: number;
  virtualIndex: number;
  gridTemplateColumns: string;
  showBottomBorder: boolean;
  rowClassName?: string;
  selected: boolean;
  measureElement: (node: HTMLTableRowElement | null) => void;
  onRowClick?: (row: Row<TData>) => void;
}

const DataRow = memo(function DataRow<TData extends RowData>({
  row,
  visibleCells,
  start,
  virtualIndex,
  gridTemplateColumns,
  showBottomBorder,
  rowClassName,
  selected,
  measureElement,
  onRowClick,
}: DataRowProps<TData>) {
  const style = useMemo<CSSProperties>(
    () => ({ gridTemplateColumns, transform: `translateY(${start}px)` }),
    [gridTemplateColumns, start],
  );

  const handleClick = useCallback(() => {
    onRowClick?.(row);
  }, [onRowClick, row]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (!onRowClick) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowClick(row);
      }
    },
    [onRowClick, row],
  );

  return (
    <tr
      ref={measureElement}
      data-index={virtualIndex}
      data-state={selected ? 'selected' : undefined}
      aria-selected={selected || undefined}
      tabIndex={onRowClick ? 0 : undefined}
      className={cn(
        'absolute left-0 top-0 grid w-full items-center bg-card',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset',
        { 'border-b border-border': showBottomBorder },
        { 'cursor-pointer hover:bg-muted/40': onRowClick },
        selected && 'bg-primary/[0.06] hover:bg-primary/[0.09]',
        rowClassName,
      )}
      style={style}
      onClick={onRowClick ? handleClick : undefined}
      onKeyDown={onRowClick ? handleKeyDown : undefined}
    >
      {visibleCells.map((cell) => (
        <td
          key={cell.id}
          className={cn('min-w-0 overflow-hidden px-3 py-3', cell.column.columnDef.meta?.cellClassName)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}) as <TData extends RowData>(props: DataRowProps<TData>) => ReactElement;

interface LoadingRowProps<TData extends RowData> {
  headers: Header<TData, unknown>[];
  start: number;
  virtualIndex: number;
  gridTemplateColumns: string;
  showBottomBorder: boolean;
  measureElement: (node: HTMLTableRowElement | null) => void;
}

function countSelectedRows(selection: RowSelectionState | undefined) {
  return Object.values(selection ?? EMPTY_ROW_SELECTION).filter(Boolean).length;
}

function LoadingRow<TData extends RowData>({
  headers,
  start,
  virtualIndex,
  gridTemplateColumns,
  showBottomBorder,
  measureElement,
}: LoadingRowProps<TData>) {
  const style = useMemo<CSSProperties>(
    () => ({ gridTemplateColumns, transform: `translateY(${start}px)` }),
    [gridTemplateColumns, start],
  );

  return (
    <tr
      ref={measureElement}
      data-index={virtualIndex}
      className={cn('absolute left-0 top-0 grid w-full items-center bg-card', {
        'border-b border-border': showBottomBorder,
      })}
      style={style}
    >
      {headers.map((header) => (
        <td
          key={header.id}
          className={cn('min-w-0 overflow-hidden px-3 py-3', header.column.columnDef.meta?.cellClassName)}
        >
          {header.column.columnDef.meta?.loadingCell ?? (
            <Skeleton className={cn('h-4 w-24', header.column.columnDef.meta?.skeletonClassName)} />
          )}
        </td>
      ))}
    </tr>
  );
}

function HeaderCell<TData extends RowData>({ header }: { header: Header<TData, unknown> }) {
  const sorted = header.column.getIsSorted();
  const content = flexRender(header.column.columnDef.header, header.getContext());
  const className = cn(
    'min-w-0 overflow-hidden px-3 text-left text-label-14 font-medium text-muted-foreground',
    header.column.columnDef.meta?.headerClassName,
  );

  if (!header.column.getCanSort()) {
    return <th className={className}>{content}</th>;
  }

  return (
    <th className={className} aria-sort={getAriaSort(sorted)}>
      <button
        type="button"
        onClick={header.column.getToggleSortingHandler()}
        className={cn(
          '-ml-2 inline-flex h-9 max-w-full items-center gap-1 rounded-lg px-2 transition-colors',
          'hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
          { 'text-foreground': sorted !== false },
        )}
      >
        <span className="truncate">{content}</span>
        <SortIcon direction={sorted} />
      </button>
    </th>
  );
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') {
    return <ArrowUpIcon className="size-3.5" />;
  }

  if (direction === 'desc') {
    return <ArrowDownIcon className="size-3.5" />;
  }

  return <ArrowsDownUpIcon className="size-3.5 opacity-45" />;
}

function getAriaSort(direction: SortDirection) {
  if (direction === 'asc') {
    return 'ascending';
  }

  if (direction === 'desc') {
    return 'descending';
  }

  return 'none';
}

function getGridTemplateColumns<TData extends RowData>(columns: Column<TData, unknown>[]): string {
  return columns.map((column) => column.columnDef.meta?.gridSize ?? `${column.getSize()}px`).join(' ');
}
