import { fieldTypeRegistry } from '@comitium/schemas/forms';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { Textarea } from '@comitium/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateCustomField } from '@/hooks/mutations/use-custom-field';
import {
  CUSTOM_FIELD_DESCRIPTION_MAX,
  CUSTOM_FIELD_TITLE_MAX,
  type CustomFieldRow,
  type UpdateCustomFieldBody,
} from '@/lib/schemas/custom-fields';

import { type CustomFieldFormData, customFieldFormSchema, optionsToSelectableValues } from './custom-field-form';
import { getFieldTypeLabel } from './labels';
import { SelectableValuesEditor } from './selectable-values-editor';

interface CustomFieldEditSheetProps {
  orgId: string;
  field: CustomFieldRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = 'custom-field-edit-form';

export function CustomFieldEditSheet({ orgId, field, open, onOpenChange }: CustomFieldEditSheetProps) {
  const { mutate, isPending } = useUpdateCustomField();

  const defaultValues = useMemo<CustomFieldFormData>(() => {
    if (!field) {
      return {
        title: '',
        description: '',
        objectType: 'candidate',
        fieldType: 'short_answer',
        options: [],
        isPrivate: false,
      };
    }

    return {
      title: field.title,
      description: field.description ?? '',
      objectType: field.objectType,
      fieldType: field.fieldType,
      options: (field.selectableValues ?? []).map((sv) => ({
        label: sv.label,
        value: sv.value,
        ...(sv.isArchived ? { isArchived: true } : {}),
      })),
      isPrivate: field.isPrivate,
    };
  }, [field]);

  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const lastFieldRef = useRef<CustomFieldRow | null>(null);

  if (open && field) {
    lastFieldRef.current = field;
  }

  const displayField = open ? field : lastFieldRef.current;
  const fieldTypeDef = displayField ? fieldTypeRegistry[displayField.fieldType] : null;
  const needsOptions = !!fieldTypeDef?.capabilities.requiresSelectableValues;

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (isPending) {
        return;
      }

      onOpenChange(v);
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const onSubmit = useCallback(
    (data: CustomFieldFormData) => {
      if (!field) {
        return;
      }

      const dirty = form.formState.dirtyFields;
      const body: UpdateCustomFieldBody = {};

      if (dirty.title) {
        body.title = data.title;
      }

      if (dirty.description) {
        body.description = data.description.trim() || null;
      }

      if (needsOptions && dirty.options) {
        body.selectableValues = optionsToSelectableValues(data.options);
      }

      if (Object.keys(body).length === 0) {
        onOpenChange(false);
        return;
      }

      mutate({ orgId, id: field.id, body }, { onSuccess: () => onOpenChange(false) });
    },
    [field, form, mutate, needsOptions, onOpenChange, orgId],
  );

  if (!displayField) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Edit custom field</SheetTitle>
          <SheetDescription>Only the title, description, and options can be edited after creation.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <ReadOnlyRow label="Apply to" value="Candidate" />

              <ReadOnlyRow label="Field type" value={getFieldTypeLabel(displayField.fieldType)} />

              <FormField
                control={form.control}
                name="title"
                render={({ field: ctl }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input maxLength={CUSTOM_FIELD_TITLE_MAX} disabled={isPending} {...ctl} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field: ctl }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What this field is for. Shown under the label when filling in."
                        maxLength={CUSTOM_FIELD_DESCRIPTION_MAX}
                        rows={2}
                        disabled={isPending}
                        {...ctl}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsOptions && (
                <SelectableValuesEditor control={form.control} setValue={form.setValue} disabled={isPending} />
              )}

              {displayField.isPrivate && <ReadOnlyBadge icon={<LockIcon className="size-3.5" />} label="Private" />}
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-14 text-muted-foreground">{label}</span>
      <div className="text-copy-14">{value}</div>
    </div>
  );
}

function ReadOnlyBadge({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <Badge variant="secondary" className="gap-1">
      {icon}
      {label}
    </Badge>
  );
}
