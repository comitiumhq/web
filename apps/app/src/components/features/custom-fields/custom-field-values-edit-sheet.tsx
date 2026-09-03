import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@comitium/ui/form';
import { Sheet, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { LockIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { CustomFieldValueRow } from '@/lib/schemas/candidate-custom-field-values';
import type { CustomFieldRow } from '@/lib/schemas/custom-fields';
import type { OrgTeamMember } from '@/lib/schemas/org';

import { CustomFieldValueEdit } from './custom-field-value-edit';
import { type BatchSaveCustomFieldItem, useBatchSaveCustomFieldValues } from './use-batch-save-custom-field-values';

interface CustomFieldValuesEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitions: CustomFieldRow[];
  decryptedValues: Record<string, unknown>;
  valueByFieldId: Map<string, CustomFieldValueRow>;
  team: OrgTeamMember[];
  orgId: string;
  candidateId: string;
}

type FormValues = Record<string, unknown>;

const FORM_ID = 'custom-field-values-edit-form';

export function CustomFieldValuesEditSheet({
  open,
  onOpenChange,
  definitions,
  decryptedValues,
  valueByFieldId,
  team,
  orgId,
  candidateId,
}: CustomFieldValuesEditSheetProps) {
  const batchSave = useBatchSaveCustomFieldValues({ orgId, candidateId });

  const defaultValues = useMemo<FormValues>(() => {
    const init: FormValues = {};

    for (const def of definitions) {
      const valueRow = valueByFieldId.get(def.id);
      const current = valueRow ? decryptedValues[valueRow.id] : undefined;

      init[def.id] = current ?? null;
    }

    return init;
  }, [definitions, decryptedValues, valueByFieldId]);

  const form = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const handleClose = useCallback(() => {
    if (batchSave.isPending) {
      return;
    }

    onOpenChange(false);
  }, [batchSave.isPending, onOpenChange]);

  const handleCancel = useCallback(() => handleClose(), [handleClose]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const dirty = form.formState.dirtyFields;
      const items: BatchSaveCustomFieldItem[] = [];

      for (const def of definitions) {
        if (!dirty[def.id]) {
          continue;
        }

        items.push({
          fieldId: def.id,
          fieldType: def.fieldType,
          value: values[def.id],
        });
      }

      if (items.length === 0) {
        onOpenChange(false);
        return;
      }

      await batchSave.mutateAsync(items, {
        onSuccess: () => {
          toast.success('Custom fields saved');
          onOpenChange(false);
        },
      });
    },
    [form, definitions, batchSave, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <FeatureSheetContent width="md">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Edit custom fields</SheetTitle>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {definitions.map((def) => (
                <FormField
                  key={def.id}
                  control={form.control}
                  name={def.id}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        {def.title}
                        {def.isPrivate && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <LockIcon className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Private field. Only organization admins can view it.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </FormLabel>
                      {def.description && <FormDescription>{def.description}</FormDescription>}
                      <FormControl>
                        <CustomFieldValueEdit
                          fieldType={def.fieldType}
                          value={field.value}
                          selectableValues={def.selectableValues}
                          team={team}
                          onChange={field.onChange}
                          disabled={batchSave.isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={batchSave.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={batchSave.isPending}>
            {batchSave.isPending && <Spinner data-icon="inline-start" />}
            {batchSave.isPending ? 'Saving…' : 'Save'}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
