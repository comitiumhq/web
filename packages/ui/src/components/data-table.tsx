import type * as React from 'react';
import { cn } from '../lib/cn';
import { Card } from './card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from './table';

export interface DataTableColumn {
  id: string;
  header: React.ReactNode;
  className?: string;
}

const DATA_TABLE_CLASS = 'min-h-0 max-h-full';
const DATA_TABLE_SCROLL_AREA_CLASS = 'max-h-[inherit] [scrollbar-gutter:stable]';
const DATA_TABLE_WRAPPER_CLASS = 'flex min-h-0 max-h-full flex-col gap-4';

interface DataTableProps extends Omit<React.ComponentProps<typeof Card>, 'children'> {
  columns: DataTableColumn[];
  children: React.ReactNode;
  scrollAreaClassName?: string;
  headerRowClassName?: string;
}

function DataTable({
  columns,
  children,
  className,
  scrollAreaClassName,
  headerRowClassName,
  ...props
}: DataTableProps) {
  return (
    <Card {...props} data-slot="data-table" className={cn('min-h-0 border border-border py-0 ring-0', className)}>
      <div
        data-slot="data-table-scroll-area"
        className={cn('min-h-0 overflow-auto [&_[data-slot=table-container]]:overflow-visible', scrollAreaClassName)}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted [&_th]:bg-muted">
            <TableRow className={cn('bg-muted hover:bg-muted', headerRowClassName)}>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
    </Card>
  );
}

export { DATA_TABLE_CLASS, DATA_TABLE_SCROLL_AREA_CLASS, DATA_TABLE_WRAPPER_CLASS, DataTable };
