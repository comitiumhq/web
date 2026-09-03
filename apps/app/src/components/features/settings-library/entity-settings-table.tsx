import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DATA_TABLE_WRAPPER_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TablePagination } from '@comitium/ui/table-pagination';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/constants/ui-config';

import { clampEntityPage, getEntityPageRows } from './entity-table-utils';
import type { ArchivableEntity, EntityEmptyState, EntityTabValue } from './types';

interface EntitySettingsTableProps<T extends ArchivableEntity> {
  tab: EntityTabValue;
  isLoading: boolean;
  activeRows: T[];
  archivedRows: T[];
  columns: DataTableColumn[];
  skeletonColumns: TableSkeletonColumn[];
  emptyState: Record<EntityTabValue, EntityEmptyState>;
  renderRow: (row: T) => ReactNode;
}

export function EntitySettingsTable<T extends ArchivableEntity>({
  tab,
  isLoading,
  activeRows,
  archivedRows,
  columns,
  skeletonColumns,
  emptyState,
  renderRow,
}: EntitySettingsTableProps<T>) {
  const [page, setPage] = useState(1);
  const rows = tab === 'archived' ? archivedRows : activeRows;
  const pageRows = useMemo(() => getEntityPageRows(rows, page), [rows, page]);
  const renderedRows = useMemo(() => pageRows.map(renderRow), [pageRows, renderRow]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    setPage((currentPage) => clampEntityPage(currentPage, rows.length));
  }, [rows.length]);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  if (isLoading) {
    return (
      <TableSkeleton
        columns={skeletonColumns}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyStateCard {...emptyState[tab]} />;
  }

  return (
    <div className={DATA_TABLE_WRAPPER_CLASS}>
      <DataTable columns={columns} className={DATA_TABLE_CLASS} scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}>
        {renderedRows}
      </DataTable>

      <TablePagination
        page={page}
        pageSize={SETTINGS_TABLE_PAGE_SIZE}
        totalRows={rows.length}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
