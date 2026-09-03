import type { JobAccessRole } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { PlusIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo, useState } from 'react';
import type { OrgDepartment } from '@/lib/schemas/org-structure';

import { DepartmentAccessForm } from './department-access-form';
import { addOptionSubtitle, parentNameOf } from './department-helpers';

interface AddDepartmentAccessProps {
  availableDepartments: OrgDepartment[];
  parentIds: Set<string>;
  departmentMap: Map<string, OrgDepartment>;
  disabled: boolean;
  onAdd: (departmentId: string, role: JobAccessRole) => Promise<boolean>;
}

export const AddDepartmentAccess = memo(function AddDepartmentAccess({
  availableDepartments,
  parentIds,
  departmentMap,
  disabled,
  onAdd,
}: AddDepartmentAccessProps) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState<JobAccessRole>('hiring_member');
  const departmentOptions = useMemo(
    () =>
      availableDepartments.map((department) => {
        const subtitle = addOptionSubtitle(parentNameOf(department.id, departmentMap), parentIds.has(department.id));

        return { id: department.id, name: department.name, subtitle };
      }),
    [availableDepartments, departmentMap, parentIds],
  );

  const handleRoleChange = useCallback((nextRole: JobAccessRole) => setRole(nextRole), []);

  const resetForm = useCallback(() => {
    setDepartmentId('');
    setRole('hiring_member');
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (disabled) {
        return;
      }

      setOpen(nextOpen);

      if (!nextOpen) {
        resetForm();
      }
    },
    [disabled, resetForm],
  );

  const handleCancel = useCallback(() => {
    if (disabled) {
      return;
    }

    setOpen(false);
    resetForm();
  }, [disabled, resetForm]);

  const handleAdd = useCallback(async () => {
    if (departmentId.length === 0) {
      return;
    }

    const accepted = await onAdd(departmentId, role);

    if (!accepted) {
      return;
    }

    setOpen(false);
    resetForm();
  }, [departmentId, role, onAdd, resetForm]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" disabled={disabled} aria-label="Grant access">
          <PlusIcon className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[360px] max-w-[calc(100vw-2rem)] gap-3 p-3">
        <DepartmentAccessForm
          title="Grant Access"
          departmentOptions={departmentOptions}
          fixedDepartment={null}
          departmentId={departmentId}
          role={role}
          submitLabel="Grant"
          disabled={disabled}
          submitDisabled={disabled || departmentId.length === 0}
          onDepartmentChange={setDepartmentId}
          onRoleChange={handleRoleChange}
          onCancel={handleCancel}
          onSubmit={handleAdd}
        />
      </PopoverContent>
    </Popover>
  );
});
