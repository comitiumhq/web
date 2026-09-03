import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateArchiveReason, useUpdateArchiveReason } from '@/hooks/mutations/use-archive-reason';
import type { ArchiveReasonRow } from '@/lib/schemas/archive-reasons';

import { buildCreatePayload, type ReasonFormData, reasonFormSchema, reasonToFormDefaults } from './reason-form';
import { LabelField, ReasonClassificationField } from './reason-form-fields';

interface ReasonEditorDialogProps {
  orgId: string;
  reason: ArchiveReasonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReasonEditorDialog({ orgId, reason, open, onOpenChange }: ReasonEditorDialogProps) {
  const isEdit = reason !== null;
  const createMutation = useCreateArchiveReason();
  const updateMutation = useUpdateArchiveReason();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ReasonFormData>({
    resolver: zodResolver(reasonFormSchema),
    defaultValues: reasonToFormDefaults(null),
  });

  useEffect(() => {
    if (open) {
      form.reset(reasonToFormDefaults(reason));
    }
  }, [open, reason, form]);

  const onSubmit = useCallback(
    async (data: ReasonFormData) => {
      if (isEdit && reason) {
        await updateMutation.mutateAsync({ orgId, id: reason.id, body: { label: data.label } });
      } else {
        await createMutation.mutateAsync({ orgId, body: buildCreatePayload(data) });
      }

      onOpenChange(false);
    },
    [createMutation, isEdit, onOpenChange, orgId, reason, updateMutation],
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!isPending) {
        onOpenChange(v);
      }
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const title = isEdit ? 'Edit archive reason' : 'New archive reason';
  const description = isEdit
    ? 'Update the archive reason label.'
    : 'Choose an outcome and enter a label for the archive reason.';
  const idleSubmitLabel = isEdit ? 'Save changes' : 'Create reason';
  const submitLabel = isPending ? 'Saving…' : idleSubmitLabel;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {!isEdit && <ReasonClassificationField control={form.control} disabled={isPending} />}
            <LabelField control={form.control} disabled={isPending} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner data-icon="inline-start" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
