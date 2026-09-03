import type { DataTableColumn } from '@comitium/ui/data-table';
import type { TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { useCallback } from 'react';
import { EntitySettingsTable } from '@/components/features/settings-library/entity-settings-table';
import type { ArchiveReasonRow } from '@/lib/schemas/archive-reasons';

import { EMPTY_STATE_CONFIG, type TabValue } from './constants';
import { ReasonTableRow } from './reason-table-row';

const REASON_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'outcome', header: 'Outcome' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Outcome', cellWidth: 'w-32' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

interface ReasonsListProps {
  tab: TabValue;
  isLoading: boolean;
  orgId: string;
  activeReasons: ArchiveReasonRow[];
  archivedReasons: ArchiveReasonRow[];
  onEdit: (r: ArchiveReasonRow) => void;
}

export function ReasonsList({ tab, isLoading, orgId, activeReasons, archivedReasons, onEdit }: ReasonsListProps) {
  const renderRow = useCallback(
    (reason: ArchiveReasonRow) => <ReasonTableRow key={reason.id} orgId={orgId} reason={reason} onEdit={onEdit} />,
    [orgId, onEdit],
  );

  return (
    <EntitySettingsTable
      tab={tab}
      isLoading={isLoading}
      activeRows={activeReasons}
      archivedRows={archivedReasons}
      columns={REASON_COLUMNS}
      skeletonColumns={SKELETON_COLUMNS}
      emptyState={EMPTY_STATE_CONFIG}
      renderRow={renderRow}
    />
  );
}
