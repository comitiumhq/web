import { Button } from '@comitium/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { ArchiveIcon, ArrowCounterClockwiseIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import { type Control, type UseFormSetValue, useFieldArray, useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';

import type { CustomFieldFormData } from './custom-field-form';

interface SelectableValuesEditorProps {
  control: Control<CustomFieldFormData>;
  setValue: UseFormSetValue<CustomFieldFormData>;
  disabled: boolean;
}

export const SelectableValuesEditor = memo(function SelectableValuesEditor({
  control,
  setValue,
  disabled,
}: SelectableValuesEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  const handleAdd = useCallback(() => append({ label: '' }), [append]);

  const handleToggleArchive = useCallback(
    (index: number, next: boolean) => {
      setValue(`options.${index}.isArchived`, next, { shouldDirty: true });
    },
    [setValue],
  );

  return (
    <FormItem>
      <FormLabel>Options</FormLabel>
      <FormControl>
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <OptionRow
              key={field.id}
              control={control}
              index={index}
              disabled={disabled}
              onRemove={remove}
              onToggleArchive={handleToggleArchive}
            />
          ))}

          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            Add option
          </Button>
        </div>
      </FormControl>
    </FormItem>
  );
});

interface OptionRowProps {
  control: Control<CustomFieldFormData>;
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
  onToggleArchive: (index: number, next: boolean) => void;
}

const OptionRow = memo(function OptionRow({ control, index, disabled, onRemove, onToggleArchive }: OptionRowProps) {
  const option = useWatch({ control, name: `options.${index}` });
  const isPersisted = !!option?.value;
  const isArchived = !!option?.isArchived;

  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);
  const handleArchive = useCallback(() => onToggleArchive(index, true), [onToggleArchive, index]);
  const handleRestore = useCallback(() => onToggleArchive(index, false), [onToggleArchive, index]);

  return (
    <FormField
      control={control}
      name={`options.${index}.label`}
      render={({ field }) => (
        <FormItem className="gap-1">
          <div className="flex gap-2 items-center">
            <FormControl>
              <Input
                placeholder="Option label"
                disabled={disabled || isArchived}
                className={cn('flex-1', { 'text-muted-foreground line-through': isArchived })}
                {...field}
              />
            </FormControl>
            {isPersisted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-9 shrink-0 p-0"
                disabled={disabled}
                onClick={isArchived ? handleRestore : handleArchive}
              >
                {isArchived ? <ArrowCounterClockwiseIcon /> : <ArchiveIcon />}
                <span className="sr-only">{isArchived ? 'Restore option' : 'Archive option'}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-9 shrink-0 p-0"
                disabled={disabled}
                onClick={handleRemove}
              >
                <XIcon />
                <span className="sr-only">Remove option</span>
              </Button>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
