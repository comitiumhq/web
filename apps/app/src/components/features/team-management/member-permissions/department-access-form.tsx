import type { JobAccessRole } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Combobox } from '@comitium/ui/combobox';
import { Label } from '@comitium/ui/label';
import { PopoverHeader, PopoverTitle } from '@comitium/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Spinner } from '@comitium/ui/spinner';
import { type ReactNode, useCallback } from 'react';
import { JOB_ACCESS_ROLES } from '@/lib/constants/job-access';

interface DepartmentAccessOption {
  id: string;
  name: string;
  subtitle: string | null;
}

interface FixedDepartmentAccessTarget {
  name: string;
  subtitle: string | null;
}

interface DepartmentAccessFormProps {
  title: string;
  departmentOptions?: DepartmentAccessOption[];
  fixedDepartment: FixedDepartmentAccessTarget | null;
  departmentId: string;
  role: JobAccessRole;
  submitLabel: string;
  submitIcon?: ReactNode;
  disabled: boolean;
  submitDisabled: boolean;
  onDepartmentChange?: (departmentId: string) => void;
  onRoleChange: (role: JobAccessRole) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function DepartmentAccessForm({
  title,
  departmentOptions = [],
  fixedDepartment,
  departmentId,
  role,
  submitLabel,
  submitIcon = null,
  disabled,
  submitDisabled,
  onDepartmentChange,
  onRoleChange,
  onCancel,
  onSubmit,
}: DepartmentAccessFormProps) {
  const handleDepartmentChange = useCallback(
    (value: string) => {
      onDepartmentChange?.(value);
    },
    [onDepartmentChange],
  );

  const handleRoleChange = useCallback((value: string) => onRoleChange(value as JobAccessRole), [onRoleChange]);

  const roleItems = JOB_ACCESS_ROLES.map((option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ));
  return (
    <>
      <PopoverHeader>
        <PopoverTitle className="text-heading-14">{title}</PopoverTitle>
      </PopoverHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label className="text-label-12 text-muted-foreground">Team</Label>
          {fixedDepartment ? (
            <div className="flex min-h-9 w-full min-w-0 flex-col justify-center rounded-2xl bg-muted/50 px-3 py-2">
              <span className="text-label-13 truncate text-foreground">{fixedDepartment.name}</span>
              {fixedDepartment.subtitle && (
                <span className="text-copy-12 truncate text-muted-foreground">{fixedDepartment.subtitle}</span>
              )}
            </div>
          ) : (
            <Combobox
              ariaLabel="Team"
              options={departmentOptions.map((option) => ({
                value: option.id,
                label: option.name,
                description: option.subtitle ?? undefined,
              }))}
              value={departmentId || null}
              clearable={false}
              onValueChange={(nextValue) => nextValue && handleDepartmentChange(nextValue)}
              placeholder="Select team"
              searchPlaceholder="Search teams…"
              emptyMessage="No more teams."
              disabled={disabled}
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <Label className="text-label-12 text-muted-foreground">Access Role</Label>
          <Select value={role} onValueChange={handleRoleChange} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{roleItems}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSubmit} disabled={submitDisabled}>
          {disabled ? <Spinner data-icon="inline-start" /> : submitIcon}
          {submitLabel}
        </Button>
      </div>
    </>
  );
}
