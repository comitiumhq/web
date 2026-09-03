import { DATA_TABLE_CLASS, DATA_TABLE_SCROLL_AREA_CLASS } from '@comitium/ui/data-table';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Stages', cellWidth: 'w-12' },
  { header: 'Used by', cellWidth: 'w-28' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

export function TemplateTableSkeleton() {
  return (
    <TableSkeleton
      columns={SKELETON_COLUMNS}
      rows={4}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    />
  );
}
