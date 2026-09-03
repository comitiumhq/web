import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import type { Control } from 'react-hook-form';
import { REASON_LABEL_MAX } from '@/lib/schemas/close-reasons';

import type { ReasonFormData } from './reason-form';

interface FieldProps {
  control: Control<ReasonFormData>;
  disabled: boolean;
}

export function LabelField({ control, disabled }: FieldProps) {
  return (
    <FormField
      control={control}
      name="label"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input
              placeholder="e.g. Position filled"
              maxLength={REASON_LABEL_MAX}
              autoFocus
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
