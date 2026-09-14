import { Combobox } from '@comitium/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface ActivityTemplateOption {
  id: string;
  label: string;
}

interface ActivityTemplateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  items: ActivityTemplateOption[];
}

export function ActivityTemplateField<T extends FieldValues>({
  control,
  name,
  label,
  items,
}: ActivityTemplateFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Combobox
              ariaLabel={label}
              options={items.map((item) => ({ value: item.id, label: item.label }))}
              value={(field.value as string) || null}
              onValueChange={field.onChange}
              placeholder="Select a template"
              searchPlaceholder="Search templates…"
              emptyMessage="No templates available."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
