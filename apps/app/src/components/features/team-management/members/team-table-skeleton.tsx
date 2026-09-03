import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';

const COLUMNS: TableSkeletonColumn[] = [
  { header: 'Member', cellWidth: 'w-40' },
  { header: 'Role', cellWidth: 'w-28' },
  { header: 'Access', cellWidth: 'w-28' },
];

interface TeamTableSkeletonProps {
  className?: string;
  scrollAreaClassName?: string;
}

export function TeamTableSkeleton({ className, scrollAreaClassName }: TeamTableSkeletonProps) {
  return <TableSkeleton columns={COLUMNS} rows={8} className={className} scrollAreaClassName={scrollAreaClassName} />;
}
