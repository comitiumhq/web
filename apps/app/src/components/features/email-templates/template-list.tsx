import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyState } from '@comitium/ui/empty-state';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TablePagination } from '@comitium/ui/table-pagination';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon, EnvelopeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryEmailTemplates } from '@/hooks/queries/use-query-email-templates';
import { usePermissions } from '@/hooks/use-permissions';
import type { EmailTemplateResponse } from '@/lib/schemas/emails';
import { Permission } from '@/lib/schemas/org';

import { TemplateEditorSheet } from './template-editor-sheet';
import { TemplateTableRow } from './template-table-row';

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Subject', cellWidth: 'w-48' },
  { header: 'Use case', cellWidth: 'w-20', className: 'hidden xl:table-cell' },
  { header: 'Used by', cellWidth: 'w-24' },
  { header: 'Updated', cellWidth: 'w-24', className: 'hidden 2xl:table-cell' },
  { header: 'Actions', align: 'right', isAction: true },
];

const PAGE_SIZE = 10;

const TEMPLATE_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name', className: 'w-52 max-w-52' },
  { id: 'subject', header: 'Subject', className: 'max-w-80' },
  { id: 'use-case', header: 'Use case', className: 'hidden xl:table-cell' },
  { id: 'used-by', header: 'Used by', className: 'w-40' },
  { id: 'updated', header: 'Updated', className: 'hidden 2xl:table-cell' },
  { id: 'actions', header: 'Actions', className: 'w-12 text-right' },
];

type DialogMode = 'edit' | 'create';
type TabValue = 'active' | 'archived';

const EMPTY_STATE_CONFIG: Record<TabValue, { icon: PhosphorIcon; title: string; description: string }> = {
  active: {
    icon: EnvelopeIcon,
    title: 'No email templates yet',
    description: 'Get started by creating your first template.',
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

interface EmailTemplateListProps {
  orgId: string;
}

export function EmailTemplateList({ orgId }: EmailTemplateListProps) {
  const [tab, setTab] = useState<TabValue>('active');
  const [page, setPage] = useState(1);
  const { data: allTemplates, isLoading, error } = useQueryEmailTemplates(orgId, true);
  const { can } = usePermissions();
  const canManage = can(Permission.EMAIL_TEMPLATE_WRITE);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: DialogMode;
    template: EmailTemplateResponse | null;
  }>({ open: false, mode: 'create', template: null });

  const activeTemplates = useMemo(() => (allTemplates ?? []).filter((t) => !t.isArchived), [allTemplates]);
  const archivedTemplates = useMemo(() => (allTemplates ?? []).filter((t) => t.isArchived), [allTemplates]);
  const templates = tab === 'active' ? activeTemplates : archivedTemplates;
  const pageRows = useMemo(() => templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, templates]);

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabValue);
    setPage(1);
  }, []);

  const handleCreate = useCallback(() => {
    setDialogState({ open: true, mode: 'create', template: null });
  }, []);

  const handleEdit = useCallback((template: EmailTemplateResponse) => {
    setDialogState({ open: true, mode: 'edit', template });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load email templates. Please try again."
        />
      </div>
    );
  }

  return (
    <>
      <EntitySettingsPage
        title="Email Templates"
        tab={tab}
        activeCount={activeTemplates.length}
        archivedCount={archivedTemplates.length}
        isError={false}
        errorDescription=""
        onTabChange={handleTabChange}
        onCreateClick={handleCreate}
        createLabel="New template"
        createVisible={canManage}
      >
        <TemplatesTable
          orgId={orgId}
          isLoading={isLoading}
          templates={pageRows}
          tab={tab}
          canManage={canManage}
          onEdit={handleEdit}
        />

        {!isLoading && templates.length > 0 && (
          <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={templates.length} onPageChange={setPage} />
        )}
      </EntitySettingsPage>

      <TemplateEditorSheet
        orgId={orgId}
        open={dialogState.open}
        mode={dialogState.mode}
        template={dialogState.template}
        onClose={handleClose}
      />
    </>
  );
}

interface TemplatesTableProps {
  orgId: string;
  isLoading: boolean;
  templates: EmailTemplateResponse[];
  tab: TabValue;
  canManage: boolean;
  onEdit: (template: EmailTemplateResponse) => void;
}

function TemplatesTable({ orgId, isLoading, templates, tab, canManage, onEdit }: TemplatesTableProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (templates.length === 0) {
    return <TemplateEmptyState tab={tab} />;
  }

  return (
    <DataTable
      columns={TEMPLATE_COLUMNS}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    >
      {templates.map((template) => (
        <TemplateTableRow key={template.id} orgId={orgId} template={template} canManage={canManage} onEdit={onEdit} />
      ))}
    </DataTable>
  );
}
