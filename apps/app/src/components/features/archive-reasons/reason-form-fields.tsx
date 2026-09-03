import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import type { Control } from 'react-hook-form';
import { REASON_LABEL_MAX } from '@/lib/schemas/archive-reasons';

import { ARCHIVE_REASON_CLASSIFICATION_LABELS } from './labels';
import { ARCHIVE_REASON_CLASSIFICATION_OPTIONS, type ReasonFormData } from './reason-form';

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
              placeholder="e.g. Insufficient experience"
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

export function ReasonClassificationField({ control, disabled }: FieldProps) {
  return (
    <FormField
      control={control}
      name="classification"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Outcome</FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {ARCHIVE_REASON_CLASSIFICATION_OPTIONS.map((classification) => (
                <SelectItem key={classification} value={classification}>
                  {ARCHIVE_REASON_CLASSIFICATION_LABELS[classification]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
