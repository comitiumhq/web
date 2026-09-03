import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DATA_TABLE_WRAPPER_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TablePagination } from '@comitium/ui/table-pagination';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon, CalendarIcon } from '@phosphor-icons/react';
import { memo, useEffect, useState } from 'react';
import type { InterviewTemplate } from '@/lib/schemas/interview-templates';

import { TemplateRow } from './template-row';

const PAGE_SIZE = 10;

const TEMPLATE_COLUMNS: DataTableColumn[] = [
  { id: 'title', header: 'Title' },
  { id: 'external-title', header: 'External Title', className: 'hidden sm:table-cell' },
  { id: 'duration', header: 'Duration' },
  { id: 'used-by', header: 'Used by' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

type TabValue = 'active' | 'archived';

interface TemplateTableProps {
  orgId: string;
  templates: InterviewTemplate[];
  tab: TabValue;
  onEdit: (template: InterviewTemplate) => void;
}

const EMPTY_STATE_CONFIG: Record<TabValue, { icon: PhosphorIcon; title: string; description: string }> = {
  active: {
    icon: CalendarIcon,
    title: 'No interview templates yet',
    description: 'Get started by creating your first interview template.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived templates',
    description: 'Archive a template to remove it from active use without deleting it.',
  },
};

function TemplateEmptyState({ tab }: { tab: TabValue }) {
  const { icon: Icon, title, description } = EMPTY_STATE_CONFIG[tab];

  return <EmptyStateCard icon={Icon} title={title} description={description} />;
}

export const TemplateTable = memo(function TemplateTable({ orgId, templates, tab, onEdit }: TemplateTableProps) {
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
      <DataTable
        columns={TEMPLATE_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      >
        {pageRows.map((template) => (
          <TemplateRow key={template.id} orgId={orgId} template={template} onEdit={onEdit} />
        ))}
      </DataTable>

      <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={templates.length} onPageChange={setPage} />
    </div>
  );
});
