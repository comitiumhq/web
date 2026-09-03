import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { useCallback, useMemo, useState } from 'react';
import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryOrgDepartments } from '@/hooks/queries/use-query-org-structure';
import { DepartmentsAndTeamsIcon } from '@/lib/constants/domain-icons';
import type { OrgDepartment } from '@/lib/schemas/org-structure';

import { DepartmentRow } from './department-row';
import { DepartmentSheet } from './department-sheet';

type TabValue = 'active' | 'archived';

const DEPARTMENT_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'parent', header: 'Under', className: 'hidden md:table-cell' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-40' },
  { header: 'Under', cellWidth: 'w-28', hideOnMobile: true },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

interface DepartmentsSettingsListProps {
  orgId: string;
}

function sortDepartments(departments: OrgDepartment[]) {
  return [...departments].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.name.localeCompare(b.name);
  });
}

export function DepartmentsSettingsList({ orgId }: DepartmentsSettingsListProps) {
  const { data, isLoading, error } = useQueryOrgDepartments(orgId, {
    includeArchived: true,
  });
  const [tab, setTab] = useState<TabValue>('active');
  const [editTarget, setEditTarget] = useState<OrgDepartment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const departments = data?.data ?? [];
  const sorted = useMemo(() => sortDepartments(departments), [departments]);
  const parentNameById = useMemo(() => new Map(sorted.map((department) => [department.id, department.name])), [sorted]);
  const activeDepartments = useMemo(() => sorted.filter((department) => !department.isArchived), [sorted]);
  const archivedDepartments = useMemo(() => sorted.filter((department) => department.isArchived), [sorted]);
  const shownDepartments = tab === 'archived' ? archivedDepartments : activeDepartments;

  const handleTabChange = useCallback((value: string) => setTab(value as TabValue), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleEditDepartment = useCallback((department: OrgDepartment) => {
    setEditTarget(department);
  }, []);

  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) {
      setEditTarget(null);
    }
  }, []);

  return (
    <>
      <EntitySettingsPage
        title="Departments & Teams"
        tab={tab}
        activeCount={activeDepartments.length}
        archivedCount={archivedDepartments.length}
        isError={Boolean(error)}
        errorDescription="We couldn't load departments. Please try again."
        onTabChange={handleTabChange}
        onCreateClick={handleOpenCreate}
        createLabel="New department"
      >
        <DepartmentsTable
          orgId={orgId}
          isLoading={isLoading}
          departments={shownDepartments}
          parentNameById={parentNameById}
          onEdit={handleEditDepartment}
          tab={tab}
        />
      </EntitySettingsPage>

      <DepartmentSheet
        orgId={orgId}
        department={editTarget}
        departments={departments}
        open={!!editTarget}
        onOpenChange={handleCloseEdit}
      />
      <DepartmentSheet
        orgId={orgId}
        department={null}
        departments={departments}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}

interface DepartmentsTableProps {
  orgId: string;
  isLoading: boolean;
  departments: OrgDepartment[];
  parentNameById: Map<string, string>;
  tab: TabValue;
  onEdit: (department: OrgDepartment) => void;
}

function DepartmentsTable({ orgId, isLoading, departments, parentNameById, tab, onEdit }: DepartmentsTableProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (departments.length === 0) {
    const title = tab === 'archived' ? 'No archived departments' : 'No departments yet';
    const description =
      tab === 'archived'
        ? 'Archived departments will appear here.'
        : 'Create a department to start organizing jobs and access.';

    return <EmptyStateCard icon={DepartmentsAndTeamsIcon} title={title} description={description} />;
  }

  return (
    <DataTable
      columns={DEPARTMENT_COLUMNS}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    >
      {departments.map((department) => (
        <DepartmentRow
          key={department.id}
          orgId={orgId}
          department={department}
          parentName={
            department.parentDepartmentId ? (parentNameById.get(department.parentDepartmentId) ?? null) : null
          }
          onEdit={onEdit}
        />
      ))}
    </DataTable>
  );
}
