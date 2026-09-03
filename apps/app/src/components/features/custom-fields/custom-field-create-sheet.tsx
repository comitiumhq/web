import { fieldTypeRegistry } from '@comitium/schemas/forms';
import { Button } from '@comitium/ui/button';
import { Checkbox } from '@comitium/ui/checkbox';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { Textarea } from '@comitium/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateCustomField } from '@/hooks/mutations/use-custom-field';
import { CUSTOM_FIELD_DESCRIPTION_MAX, CUSTOM_FIELD_TITLE_MAX } from '@/lib/schemas/custom-fields';

import {
  type CustomFieldFormData,
  customFieldFormSchema,
  FORM_DEFAULTS,
  optionsToSelectableValues,
} from './custom-field-form';
import { CANDIDATE_FIELD_TYPE_OPTIONS, OBJECT_TYPE_OPTIONS } from './labels';
import { SelectableValuesEditor } from './selectable-values-editor';

interface CustomFieldCreateSheetProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldCreateSheet({ orgId, open, onOpenChange }: CustomFieldCreateSheetProps) {
  const { mutate, isPending } = useCreateCustomField();

  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: FORM_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(FORM_DEFAULTS);
    }
  }, [open, form]);

  const fieldType = form.watch('fieldType');
  const fieldTypeDef = fieldTypeRegistry[fieldType];
  const needsOptions = fieldTypeDef.capabilities.requiresSelectableValues;

  useEffect(() => {
    if (!needsOptions && form.getValues('options').length > 0) {
      form.setValue('options', []);
    }
  }, [needsOptions, form]);

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
      mutate(
        {
          orgId,
          body: {
            objectType: data.objectType,
            fieldType: data.fieldType,
            title: data.title,
            description: data.description.trim() || undefined,
            selectableValues: needsOptions ? optionsToSelectableValues(data.options) : undefined,
            isPrivate: data.isPrivate,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    },
    [mutate, needsOptions, onOpenChange, orgId],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">New custom field</SheetTitle>
          <SheetDescription>
            Capture structured candidate details your team can reuse across hiring workflows.
          </SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id="custom-field-create-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="objectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply to</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OBJECT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CANDIDATE_FIELD_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{fieldTypeDef.meta.description}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. LinkedIn profile"
                        maxLength={CUSTOM_FIELD_TITLE_MAX}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What this field is for. Shown under the label when filling in."
                        maxLength={CUSTOM_FIELD_DESCRIPTION_MAX}
                        rows={2}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsOptions && (
                <SelectableValuesEditor control={form.control} setValue={form.setValue} disabled={isPending} />
              )}

              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Private</FormLabel>
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
          <Button type="submit" form="custom-field-create-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving…' : 'Create field'}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
