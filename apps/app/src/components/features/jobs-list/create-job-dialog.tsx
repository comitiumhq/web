import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FromTemplatePicker } from '@/components/features/job-creation/from-template-picker';
import { useCreateDraft } from '@/hooks/mutations/use-create-draft';
import { useCreateDraftFromTemplate } from '@/hooks/mutations/use-job-template-mutations';
import { useQueryJobCreationContext } from '@/hooks/queries/use-query-job-creation-context';
import { useQueryOrgDepartments, useQueryOrgLocations } from '@/hooks/queries/use-query-org-structure';
import { type CreateDraftDialogData, CreateDraftDialogSchema } from '@/lib/schemas/draft-form';
import type { JobTemplateListItem } from '@/lib/schemas/job-templates';
import { isDefined } from '@/lib/utils';

interface CreateJobDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function emptyOptionsMessage(loading: boolean, noun: string): string {
  return loading ? `Loading ${noun}…` : `No ${noun} available yet.`;
}

export function CreateJobDialog({ orgId, open, onOpenChange }: CreateJobDialogProps) {
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const { data: creationContext } = useQueryJobCreationContext(orgId);
  const { data: departmentsData } = useQueryOrgDepartments(orgId);
  const { data: locationsData } = useQueryOrgLocations(orgId);

  const { mutate: createDraft, isPending: isCreatingDraft } = useCreateDraft(orgId);
  const { mutate: createDraftFromTemplate, isPending: isCreatingFromTemplate } = useCreateDraftFromTemplate();

  const isPending = isCreatingDraft || isCreatingFromTemplate;
  const hasTemplate = selectedTemplateId !== null;
  const orgWide = creationContext?.orgWide ?? false;

  const departmentOptions = useMemo(() => {
    const active = (departmentsData?.data ?? []).filter((department) => !department.isArchived);

    if (orgWide) {
      return active;
    }

    const allowed = new Set(creationContext?.departmentIds ?? []);

    return active.filter((department) => allowed.has(department.id));
  }, [departmentsData, orgWide, creationContext]);

  const locationOptions = useMemo(
    () => (locationsData?.data ?? []).filter((location) => !location.isArchived),
    [locationsData],
  );

  const departmentsLoading = !isDefined(departmentsData);
  const locationsLoading = !isDefined(locationsData);
  const canPickTemplate = orgWide || departmentOptions.length > 0;
  const missingDetails = departmentId === null || locationId === null;

  const form = useForm<CreateDraftDialogData>({
    resolver: zodResolver(CreateDraftDialogSchema),
    defaultValues: { title: '' },
  });

  const resetState = useCallback(() => {
    form.reset();
    setSelectedTemplateId(null);
    setDepartmentId(null);
    setLocationId(null);
  }, [form]);

  const handleCancel = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }

      onOpenChange(nextOpen);
    },
    [resetState, onOpenChange],
  );

  const handleTemplateChange = useCallback(
    (templateId: string | null, template: JobTemplateListItem | null) => {
      setSelectedTemplateId(templateId);

      if (template === null) {
        return;
      }

      const templateDepartmentAvailable = departmentOptions.some(
        (department) => department.id === template.departmentId,
      );
      const templateLocationAvailable = locationOptions.some((location) => location.id === template.locationId);

      if (template.departmentId !== null && templateDepartmentAvailable) {
        setDepartmentId(template.departmentId);
      }

      if (template.locationId !== null && templateLocationAvailable) {
        setLocationId(template.locationId);
      }
    },
    [departmentOptions, locationOptions],
  );

  const submitFromTemplate = useCallback(() => {
    if (!selectedTemplateId || departmentId === null || locationId === null) {
      return;
    }

    createDraftFromTemplate(
      { orgId, templateId: selectedTemplateId, body: { departmentId, locationId } },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          resetState();
          navigate({ to: '/org/$orgId/jobs/$jobId/details', params: { orgId, jobId: result.jobId } });
        },
      },
    );
  }, [
    selectedTemplateId,
    departmentId,
    locationId,
    createDraftFromTemplate,
    navigate,
    onOpenChange,
    orgId,
    resetState,
  ]);

  const submitBlank = useCallback(
    (data: CreateDraftDialogData) => {
      if (departmentId === null || locationId === null) {
        return;
      }

      createDraft({ title: data.title, departmentId, locationId });
    },
    [createDraft, departmentId, locationId],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (hasTemplate) {
        submitFromTemplate();
        return;
      }

      form.handleSubmit(submitBlank)(e);
    },
    [hasTemplate, submitFromTemplate, submitBlank, form],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-heading-20">New Job</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {canPickTemplate && (
              <FromTemplatePicker
                orgId={orgId}
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                disabled={isPending}
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="create-job-team">Team</Label>
                {departmentOptions.length === 0 ? (
                  <p className="text-copy-13 text-muted-foreground rounded-lg bg-foreground/[0.03] px-3 py-2">
                    {emptyOptionsMessage(departmentsLoading, 'teams')}
                  </p>
                ) : (
                  <Select value={departmentId ?? ''} onValueChange={setDepartmentId} disabled={isPending}>
                    <SelectTrigger id="create-job-team" className="w-full min-w-0">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="create-job-location">Location</Label>
                {locationOptions.length === 0 ? (
                  <p className="text-copy-13 text-muted-foreground rounded-lg bg-foreground/[0.03] px-3 py-2">
                    {emptyOptionsMessage(locationsLoading, 'locations')}
                  </p>
                ) : (
                  <Select value={locationId ?? ''} onValueChange={setLocationId} disabled={isPending}>
                    <SelectTrigger id="create-job-location" className="w-full min-w-0">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {!orgWide && departmentOptions.length > 0 && (
              <p className="text-copy-12 text-muted-foreground">
                You can create jobs for teams where you have admin access.
              </p>
            )}

            {!hasTemplate && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Frontend Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || missingDetails}>
                {isPending && <Spinner data-icon="inline-start" />}
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
