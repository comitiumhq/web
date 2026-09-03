import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateOrgDepartment, useUpdateOrgDepartment } from '@/hooks/mutations/use-org-structure';
import {
  type CreateOrgDepartmentBody,
  createOrgDepartmentBodySchema,
  type OrgDepartment,
  type UpdateOrgDepartmentBody,
} from '@/lib/schemas/org-structure';

type DepartmentFormData = CreateOrgDepartmentBody;

interface DepartmentSheetProps {
  orgId: string;
  department: OrgDepartment | null;
  departments: OrgDepartment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function departmentDefaults(department: OrgDepartment | null): DepartmentFormData {
  return {
    name: department?.name ?? '',
    parentDepartmentId: department?.parentDepartmentId ?? null,
    sortOrder: department?.sortOrder ?? 0,
  };
}

function getDepartmentParentOptions(departments: OrgDepartment[], department: OrgDepartment | null) {
  const currentDepartmentId = department?.id ?? null;
  const currentParentId = department?.parentDepartmentId ?? null;

  return departments.filter((item) => {
    if (item.id === currentDepartmentId) {
      return false;
    }

    if (!item.isArchived) {
      return true;
    }

    return item.id === currentParentId;
  });
}

function departmentParentLabel(department: OrgDepartment) {
  if (!department.isArchived) {
    return department.name;
  }

  return `${department.name} (archived)`;
}

function departmentUpdateBody(data: DepartmentFormData, department: OrgDepartment): UpdateOrgDepartmentBody {
  const body: UpdateOrgDepartmentBody = { ...data };

  if (body.parentDepartmentId === department.parentDepartmentId) {
    body.parentDepartmentId = undefined;
  }

  return body;
}

export function DepartmentSheet({ orgId, department, departments, open, onOpenChange }: DepartmentSheetProps) {
  const createMutation = useCreateOrgDepartment();
  const updateMutation = useUpdateOrgDepartment();
  const isEdit = department !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const parentOptions = useMemo(() => getDepartmentParentOptions(departments, department), [department, departments]);

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(createOrgDepartmentBodySchema),
    defaultValues: departmentDefaults(null),
  });

  useEffect(() => {
    if (open) {
      form.reset(departmentDefaults(department));
    }
  }, [department, form, open]);

  const onSubmit = useCallback(
    async (data: DepartmentFormData) => {
      if (isEdit && department) {
        await updateMutation.mutateAsync({
          orgId,
          departmentId: department.id,
          body: departmentUpdateBody(data, department),
        });
      } else {
        await createMutation.mutateAsync({ orgId, body: data });
      }

      onOpenChange(false);
    },
    [createMutation, department, isEdit, onOpenChange, orgId, updateMutation],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        onOpenChange(nextOpen);
      }
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);
  const submitLabel = isEdit ? 'Save' : 'Create';
  const title = isEdit ? 'Edit department' : 'New department';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="lg">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription>Organize jobs and control team access by department.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id="department-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Engineering" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Is under</FormLabel>
                    <Select
                      value={field.value ?? 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parentOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {departmentParentLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving...' : submitLabel}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
