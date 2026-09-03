import type { FormClass } from '@comitium/schemas/forms';
import type { FormDefinitionListItem } from '@comitium/schemas/forms/form-definitions';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DATA_TABLE_WRAPPER_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyState } from '@comitium/ui/empty-state';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TablePagination } from '@comitium/ui/table-pagination';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryFormsList } from '@/hooks/queries/use-query-forms-list';
import { usePermissions } from '@/hooks/use-permissions';
import { ApplicationFormIcon, FeedbackFormIcon } from '@/lib/constants/domain-icons';
import { Permission } from '@/lib/schemas/org';

import { FormEditSheet } from './form-edit-sheet';
import { FormListRow } from './form-list-row';

type TabValue = 'active' | 'archived';

const PAGE_SIZE = 10;

const APPLICATION_FORM_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'used-by', header: 'Used by' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const FEEDBACK_FORM_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'used-by', header: 'Used by' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const APPLICATION_SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-48' },
  { header: 'Used by', cellWidth: 'w-24' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

const FEEDBACK_SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-48' },
  { header: 'Used by', cellWidth: 'w-24' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

const FORM_CLASS_COPY: Partial<
  Record<FormClass, { pageTitle: string; emptyActiveDescription: string; icon: PhosphorIcon }>
> = {
  application: {
    pageTitle: 'Application Forms',
    emptyActiveDescription: 'Create a reusable form to capture structured responses from candidates.',
    icon: ApplicationFormIcon,
  },
  feedback: {
    pageTitle: 'Feedback Forms',
    emptyActiveDescription: 'Create your first feedback form to collect interviewer reviews.',
    icon: FeedbackFormIcon,
  },
};

const DEFAULT_COPY = {
  pageTitle: 'Forms',
  emptyActiveDescription: 'Create a form to get started.',
  icon: ApplicationFormIcon,
};

interface FormsSettingsListProps {
  orgId: string;
  formClass: FormClass;
  selectedFormId: string | null;
  onSelectedFormChange: (next: string | null) => void;
}

export function FormsSettingsList({ orgId, formClass, selectedFormId, onSelectedFormChange }: FormsSettingsListProps) {
  const copy = FORM_CLASS_COPY[formClass] ?? DEFAULT_COPY;

  const [tab, setTab] = useState<TabValue>('active');
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, error } = useQueryFormsList(orgId, {
    formClass,
    includeArchived: true,
  });

  const { can } = usePermissions();
  const canManage = can(Permission.FORM_WRITE);

  const forms = useMemo<FormDefinitionListItem[]>(() => data?.data ?? [], [data]);
  const activeForms = useMemo(() => forms.filter((f) => !f.isArchived), [forms]);
  const archivedForms = useMemo(() => forms.filter((f) => f.isArchived), [forms]);
  const shown = tab === 'active' ? activeForms : archivedForms;

  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabValue);
    setPage(1);
  }, []);

  const handleCreate = useCallback(() => setIsCreating(true), []);

  const handleClose = useCallback(() => {
    setIsCreating(false);
    onSelectedFormChange(null);
  }, [onSelectedFormChange]);

  const handleSaved = useCallback(
    (savedFormId: string) => {
      setIsCreating(false);
      onSelectedFormChange(savedFormId);
    },
    [onSelectedFormChange],
  );

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load forms. Please try again."
        />
      </div>
    );
  }

  return (
    <>
      <EntitySettingsPage
        title={copy.pageTitle}
        tab={tab}
        activeCount={activeForms.length}
        archivedCount={archivedForms.length}
        isError={false}
        errorDescription=""
        onTabChange={handleTabChange}
        onCreateClick={handleCreate}
        createLabel="New form"
        createVisible={canManage}
      >
        <FormsContent
          isLoading={isLoading}
          tab={tab}
          activeDescription={copy.emptyActiveDescription}
          activeIcon={copy.icon}
          formClass={formClass}
          forms={pageRows}
          totalRows={shown.length}
          page={page}
          canManage={canManage}
          orgId={orgId}
          onOpen={onSelectedFormChange}
          onPageChange={setPage}
        />
      </EntitySettingsPage>

      <FormEditSheet
        orgId={orgId}
        formClass={formClass}
        isCreating={isCreating}
        selectedFormId={selectedFormId}
        onSaved={handleSaved}
        onClose={handleClose}
      />
    </>
  );
}

interface FormsContentProps {
  isLoading: boolean;
  tab: TabValue;
  activeDescription: string;
  activeIcon: PhosphorIcon;
  forms: FormDefinitionListItem[];
  formClass: FormClass;
  totalRows: number;
  page: number;
  canManage: boolean;
  orgId: string;
  onOpen: (formId: string) => void;
  onPageChange: (page: number) => void;
}

function FormsContent({
  isLoading,
  tab,
  activeDescription,
  activeIcon,
  forms,
  formClass,
  totalRows,
  page,
  canManage,
  orgId,
  onOpen,
  onPageChange,
}: FormsContentProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        columns={formClass === 'feedback' ? FEEDBACK_SKELETON_COLUMNS : APPLICATION_SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (totalRows === 0) {
    return <FormEmptyState tab={tab} activeDescription={activeDescription} activeIcon={activeIcon} />;
  }

  return (
    <div className={DATA_TABLE_WRAPPER_CLASS}>
      <DataTable
        columns={formClass === 'feedback' ? FEEDBACK_FORM_COLUMNS : APPLICATION_FORM_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      >
        {forms.map((form) => (
          <FormListRow key={form.id} form={form} canManage={canManage} orgId={orgId} onOpen={onOpen} />
        ))}
      </DataTable>

      <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={totalRows} onPageChange={onPageChange} />
    </div>
  );
}

interface FormEmptyStateProps {
  tab: TabValue;
  activeDescription: string;
  activeIcon: PhosphorIcon;
}

function FormEmptyState({ tab, activeDescription, activeIcon }: FormEmptyStateProps) {
  const Icon = tab === 'active' ? activeIcon : ArchiveIcon;
  const title = tab === 'active' ? 'No forms yet' : 'No archived forms';
  const description =
    tab === 'active' ? activeDescription : 'Archive a form to keep it out of active use without losing history.';

  return <EmptyStateCard icon={Icon} title={title} description={description} />;
}
