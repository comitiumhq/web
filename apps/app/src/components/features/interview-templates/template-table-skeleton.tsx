import { DATA_TABLE_CLASS, DATA_TABLE_SCROLL_AREA_CLASS } from '@comitium/ui/data-table';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Title', cellWidth: 'w-36' },
  { header: 'External Title', cellWidth: 'w-28', hideOnMobile: true },
  { header: 'Duration', cellWidth: 'w-16' },
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
