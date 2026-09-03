import { Button } from '@comitium/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';
import { type Control, useFieldArray, useFormState } from 'react-hook-form';

import type { QuestionFormData } from './question-form';

interface QuestionOptionsEditorProps {
  control: Control<QuestionFormData>;
  disabled: boolean;
}

export const QuestionOptionsEditor = memo(function QuestionOptionsEditor({
  control,
  disabled,
}: QuestionOptionsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const { errors } = useFormState({ control, name: 'options' });
  const arrayError = errors.options?.root?.message ?? errors.options?.message;

  const handleAdd = useCallback(() => append({ label: '' }), [append]);

  return (
    <FormItem>
      <FormLabel>Options</FormLabel>
      <FormControl>
        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <OptionRow key={field.id} control={control} index={index} disabled={disabled} onRemove={remove} />
          ))}

          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            Add option
          </Button>

          {arrayError && <p className="text-copy-12 text-destructive">{arrayError}</p>}
        </div>
      </FormControl>
    </FormItem>
  );
});

interface OptionRowProps {
  control: Control<QuestionFormData>;
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

const OptionRow = memo(function OptionRow({ control, index, disabled, onRemove }: OptionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [onRemove, index]);

  return (
    <FormField
      control={control}
      name={`options.${index}.label`}
      render={({ field }) => (
        <FormItem className="gap-1">
          <div className="flex gap-2">
            <FormControl>
              <Input placeholder="Option label" disabled={disabled} className="flex-1" {...field} />
            </FormControl>
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
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
