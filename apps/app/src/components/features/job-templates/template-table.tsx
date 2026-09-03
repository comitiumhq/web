import { DATA_TABLE_WRAPPER_CLASS, DataTable, type DataTableColumn } from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TablePagination } from '@comitium/ui/table-pagination';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon, LayoutIcon, PowerIcon } from '@phosphor-icons/react';
import { memo, useEffect, useState } from 'react';
import type { JobTemplateListItem, JobTemplateStatus } from '@/lib/schemas/job-templates';

import { TemplateRow } from './template-row';

const PAGE_SIZE = 10;

const TEMPLATE_COLUMNS: DataTableColumn[] = [
  { id: 'title', header: 'Title' },
  { id: 'team', header: 'Team', className: 'hidden sm:table-cell' },
  { id: 'status', header: 'Status' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

interface TemplateTableProps {
  orgId: string;
  templates: JobTemplateListItem[];
  tab: JobTemplateStatus;
  onEdit: (template: JobTemplateListItem) => void;
  className?: string;
  scrollAreaClassName?: string;
}

const EMPTY_STATE_CONFIG: Record<JobTemplateStatus, { icon: PhosphorIcon; title: string; description: string }> = {
  active: {
    icon: PowerIcon,
    title: 'No active templates',
    description: 'Activate an inactive template, or create a new one to get started.',
  },
  inactive: {
    icon: LayoutIcon,
    title: 'No inactive templates',
    description: 'New templates start as inactive until you activate them.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived templates',
    description: 'Archive a template to remove it from active use without deleting it.',
  },
};

function TemplateEmptyState({ tab }: { tab: JobTemplateStatus }) {
  const { icon: Icon, title, description } = EMPTY_STATE_CONFIG[tab];

  return <EmptyStateCard icon={Icon} title={title} description={description} />;
}

export const TemplateTable = memo(function TemplateTable({
  orgId,
  templates,
  tab,
  onEdit,
  className,
  scrollAreaClassName,
}: TemplateTableProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const pageCount = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  if (!templates.length) {
    return <TemplateEmptyState tab={tab} />;
  }

  const pageRows = templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={DATA_TABLE_WRAPPER_CLASS}>
      <DataTable columns={TEMPLATE_COLUMNS} className={className} scrollAreaClassName={scrollAreaClassName}>
        {pageRows.map((template) => (
          <TemplateRow key={template.id} orgId={orgId} template={template} onEdit={onEdit} />
        ))}
      </DataTable>

      <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={templates.length} onPageChange={setPage} />
    </div>
  );
});
