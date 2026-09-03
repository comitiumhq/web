import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
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
          <Select value={field.value as string} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
              {items.length === 0 ? (
                <div className="px-2 py-1.5 text-copy-14 text-muted-foreground">No templates available</div>
              ) : null}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
