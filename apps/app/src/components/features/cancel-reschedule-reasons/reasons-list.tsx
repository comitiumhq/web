import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { useMemo } from 'react';
import type { ReasonCategory, ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';

import { CATEGORY_ORDER, EMPTY_STATE_CONFIG, type TabValue } from './constants';
import { ReasonTableRow } from './reason-table-row';

const REASON_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'category', header: 'Category' },
  { id: 'applies-to', header: 'Applies to' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Category', cellWidth: 'w-24' },
  { header: 'Applies to', cellWidth: 'w-24' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

interface ReasonsListProps {
  tab: TabValue;
  isLoading: boolean;
  orgId: string;
  activeGrouped: Record<ReasonCategory, ReasonRow[]>;
  archivedReasons: ReasonRow[];
  onEdit: (r: ReasonRow) => void;
}

export function ReasonsList({ tab, isLoading, orgId, activeGrouped, archivedReasons, onEdit }: ReasonsListProps) {
  const flatActive = useMemo(() => CATEGORY_ORDER.flatMap((cat) => activeGrouped[cat]), [activeGrouped]);
  const reasons = tab === 'archived' ? archivedReasons : flatActive;

  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (reasons.length === 0) {
    return <EmptyStateCard {...EMPTY_STATE_CONFIG[tab]} />;
  }

  return (
    <DataTable columns={REASON_COLUMNS} className={DATA_TABLE_CLASS} scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}>
      {reasons.map((r) => (
        <ReasonTableRow key={r.id} orgId={orgId} reason={r} onEdit={onEdit} />
      ))}
    </DataTable>
  );
}
