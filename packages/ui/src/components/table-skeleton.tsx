import { cn } from '../lib/cn';
import { DataTable, type DataTableColumn } from './data-table';
import { Skeleton } from './skeleton';
import { TableCell, TableRow } from './table';

export interface TableSkeletonColumn {
  header: string;
  cellWidth?: string;
  className?: string;
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
  isAction?: boolean;
}

interface TableSkeletonProps {
  columns: TableSkeletonColumn[];
  rows?: number;
  className?: string;
  scrollAreaClassName?: string;
}

function getSkeletonWidthClass(column: TableSkeletonColumn) {
  if (column.cellWidth) {
    return column.cellWidth;
  }

  if (column.isAction) {
    return null;
  }

  return 'w-24';
}

export function TableSkeleton({ columns, rows = 4, className, scrollAreaClassName }: TableSkeletonProps) {
  const tableColumns: DataTableColumn[] = columns.map((column) => ({
    id: column.header,
    header: column.header,
    className: cn(column.className, {
      'hidden sm:table-cell': column.hideOnMobile,
      'text-right': column.align === 'right',
    }),
  }));

  return (
    <DataTable columns={tableColumns} className={className} scrollAreaClassName={scrollAreaClassName}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx} className="hover:bg-transparent">
          {columns.map((column) => (
            <TableCell
              key={column.header}
              className={cn(column.className, {
                'hidden sm:table-cell': column.hideOnMobile,
                'flex justify-end': column.isAction,
              })}
            >
              <Skeleton
                className={cn(getSkeletonWidthClass(column), {
                  'h-4': !column.isAction,
                  'size-7 rounded': column.isAction,
                })}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </DataTable>
  );
}
