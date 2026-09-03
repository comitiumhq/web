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
import { type DragDropEventHandlers, DragDropProvider } from '@dnd-kit/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useReorderCustomFields } from '@/hooks/mutations/use-custom-field';
import type { CustomFieldRow, ListCustomFieldsResponse } from '@/lib/schemas/custom-fields';
import { applyDndReorder } from '@/lib/utils/dnd';

import { EMPTY_STATE_CONFIG, type TabValue } from './constants';
import { CustomFieldTableRow } from './custom-field-table-row';

const PAGE_SIZE = 10;

const CUSTOM_FIELD_COLUMNS: DataTableColumn[] = [
  { id: 'order', header: null, className: 'w-8' },
  { id: 'name', header: 'Name' },
  { id: 'type', header: 'Type' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: '', cellWidth: 'w-4' },
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Type', cellWidth: 'w-24' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

const QUERY_PARAMS = { objectType: 'candidate', includeArchived: true } as const;

interface CustomFieldsListProps {
  tab: TabValue;
  isLoading: boolean;
  orgId: string;
  activeFields: CustomFieldRow[];
  archivedFields: CustomFieldRow[];
  onEdit: (f: CustomFieldRow) => void;
}

export function CustomFieldsList({
  tab,
  isLoading,
  orgId,
  activeFields,
  archivedFields,
  onEdit,
}: CustomFieldsListProps) {
  const queryClient = useQueryClient();
  const { mutate: reorder } = useReorderCustomFields();

  const canReorder = tab === 'active';

  const handleDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>(
    (event) => {
      if (event.canceled) {
        return;
      }

      const reordered = applyDndReorder(activeFields, (f) => f.id, event.operation.source, event.operation.target);

      if (!reordered) {
        return;
      }

      const cacheKey = ['custom-fields-list', orgId, QUERY_PARAMS] as const;
      const current = queryClient.getQueryData<ListCustomFieldsResponse>(cacheKey);

      if (current) {
        const archivedIds = new Set(archivedFields.map((f) => f.id));
        const next = [
          ...reordered.map((f, i) => ({ ...f, sortOrder: i })),
          ...current.data.filter((f) => archivedIds.has(f.id)),
        ];

        queryClient.setQueryData<ListCustomFieldsResponse>(cacheKey, { ...current, data: next });
      }

      reorder({ orgId, body: { objectType: 'candidate', ids: reordered.map((f) => f.id) } });
    },
    [activeFields, archivedFields, orgId, queryClient, reorder],
  );

  const [archivedPage, setArchivedPage] = useState(1);

  useEffect(() => {
    setArchivedPage(1);
  }, [tab]);

  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  const fields = tab === 'archived' ? archivedFields : activeFields;

  if (fields.length === 0) {
    return <EmptyStateCard {...EMPTY_STATE_CONFIG[tab]} />;
  }

  const pagedFields =
    tab === 'archived' ? fields.slice((archivedPage - 1) * PAGE_SIZE, archivedPage * PAGE_SIZE) : fields;

  const tableBody = (
    <DataTable
      columns={CUSTOM_FIELD_COLUMNS}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    >
      {pagedFields.map((f, index) => (
        <CustomFieldTableRow key={f.id} orgId={orgId} field={f} index={index} canReorder={canReorder} onEdit={onEdit} />
      ))}
    </DataTable>
  );

  return (
    <div className={DATA_TABLE_WRAPPER_CLASS}>
      {canReorder ? <DragDropProvider onDragEnd={handleDragEnd}>{tableBody}</DragDropProvider> : tableBody}

      {tab === 'archived' && (
        <TablePagination
          page={archivedPage}
          pageSize={PAGE_SIZE}
          totalRows={fields.length}
          onPageChange={setArchivedPage}
        />
      )}
    </div>
  );
}
