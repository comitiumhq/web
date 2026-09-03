import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  useCreateCancelRescheduleReason,
  useUpdateCancelRescheduleReason,
} from '@/hooks/mutations/use-cancel-reschedule-reason';
import type { ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';

import { buildSubmitPayload, type ReasonFormData, reasonFormSchema, reasonToFormDefaults } from './reason-form';
import { AppliesToField, CategoryField, DescriptionField, LabelField } from './reason-form-fields';

interface ReasonEditorSheetProps {
  orgId: string;
  reason: ReasonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReasonEditorSheet({ orgId, reason, open, onOpenChange }: ReasonEditorSheetProps) {
  const isEdit = reason !== null;
  const createMutation = useCreateCancelRescheduleReason();
  const updateMutation = useUpdateCancelRescheduleReason();
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
      const payload = buildSubmitPayload(data);

      if (isEdit && reason) {
        await updateMutation.mutateAsync({ orgId, id: reason.id, body: payload });
      } else {
        await createMutation.mutateAsync({ orgId, body: payload });
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

  const title = isEdit ? 'Edit reason' : 'New reason';
  const idleSubmitLabel = isEdit ? 'Save changes' : 'Create reason';
  const submitLabel = isPending ? 'Saving…' : idleSubmitLabel;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="lg">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription>Shown when canceling or rescheduling an interview.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form
              id="cancel-reschedule-reason-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              <CategoryField control={form.control} disabled={isPending} />
              <LabelField control={form.control} disabled={isPending} />
              <DescriptionField control={form.control} disabled={isPending} />
              <AppliesToField control={form.control} disabled={isPending} />
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button variant="outline" type="button" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="cancel-reschedule-reason-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
