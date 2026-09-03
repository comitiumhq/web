import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Textarea } from '@comitium/ui/textarea';
import type { Control } from 'react-hook-form';
import { REASON_DESCRIPTION_MAX, REASON_LABEL_MAX } from '@/lib/schemas/cancel-reschedule-reasons';

import { APPLIES_TO_OPTIONS, CATEGORY_ORDER } from './constants';
import { REASON_APPLIES_TO_LABELS, REASON_CATEGORY_LABELS } from './labels';
import type { ReasonFormData } from './reason-form';

interface FieldProps {
  control: Control<ReasonFormData>;
  disabled: boolean;
}

export function CategoryField({ control, disabled }: FieldProps) {
  return (
    <FormField
      control={control}
      name="category"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Category</FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {REASON_CATEGORY_LABELS[c]}
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
              placeholder="e.g. Candidate withdrew"
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

export function DescriptionField({ control, disabled }: FieldProps) {
  return (
    <FormField
      control={control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description (optional)</FormLabel>
          <FormControl>
            <Textarea
              placeholder="When should this reason be used?"
              maxLength={REASON_DESCRIPTION_MAX}
              rows={2}
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

export function AppliesToField({ control, disabled }: FieldProps) {
  return (
    <FormField
      control={control}
      name="appliesTo"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Applies to</FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {APPLIES_TO_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {REASON_APPLIES_TO_LABELS[a]}
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
