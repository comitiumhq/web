import type { JobAccessRole } from '@comitium/schemas/jobs';
import { LockKeyIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';
import type { DepartmentGrant, OrgDepartment } from '@/lib/schemas/org-structure';

import { AddDepartmentAccess } from './add-department-access';
import { DepartmentGrantRow } from './department-grant-row';
import { parentNameOf } from './department-helpers';
import { SectionCard } from './section-card';

interface DepartmentAccessSectionProps {
  grants: DepartmentGrant[];
  departments: OrgDepartment[];
  canManage: boolean;
  isSelf: boolean;
  disabled: boolean;
  memberActive: boolean;
  onAdd: (departmentId: string, role: JobAccessRole) => Promise<boolean>;
  onReplaceRole: (grant: DepartmentGrant, role: JobAccessRole) => Promise<boolean>;
  onRevoke: (grant: DepartmentGrant) => Promise<boolean>;
}

export const DepartmentAccessSection = memo(function DepartmentAccessSection({
  grants,
  departments,
  canManage,
  isSelf,
  disabled,
  memberActive,
  onAdd,
  onReplaceRole,
  onRevoke,
}: DepartmentAccessSectionProps) {
  const departmentMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const parentIds = useMemo(
    () => new Set(departments.map((d) => d.parentDepartmentId).filter((id): id is string => id !== null)),
    [departments],
  );
  const grantedIds = useMemo(() => new Set(grants.map((g) => g.departmentId)), [grants]);
  const availableDepartments = useMemo(
    () => departments.filter((d) => !d.isArchived && !grantedIds.has(d.id)),
    [departments, grantedIds],
  );
  const canEdit = canManage && !isSelf;
  const canAddGrant = canEdit && memberActive;

  const handleAdd = useCallback(
    (departmentId: string, role: JobAccessRole): Promise<boolean> => {
      return onAdd(departmentId, role);
    },
    [onAdd],
  );

  const grantRows = useMemo(
    () =>
      grants.map((grant) => (
        <DepartmentGrantRow
          key={grant.id}
          grant={grant}
          hasChildren={parentIds.has(grant.departmentId)}
          parentName={parentNameOf(grant.departmentId, departmentMap)}
          canEdit={canEdit}
          disabled={disabled}
          onReplaceRole={onReplaceRole}
          onRevoke={onRevoke}
        />
      )),
    [grants, parentIds, departmentMap, canEdit, disabled, onReplaceRole, onRevoke],
  );

  return (
    <SectionCard
      title="Team Access Roles"
      action={
        canAddGrant ? (
          <AddDepartmentAccess
            availableDepartments={availableDepartments}
            parentIds={parentIds}
            departmentMap={departmentMap}
            disabled={disabled || availableDepartments.length === 0}
            onAdd={handleAdd}
          />
        ) : null
      }
    >
      {grants.length === 0 ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-muted/50 px-4 py-5 text-center">
          <LockKeyIcon className="size-4 text-muted-foreground" />
          <p className="text-label-14">No Access Roles</p>
        </div>
      ) : (
        <div className="divide-y divide-border">{grantRows}</div>
      )}
    </SectionCard>
  );
});
