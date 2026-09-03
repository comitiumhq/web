import { Textarea } from '@comitium/ui/textarea';
import type { ControllerRenderProps } from 'react-hook-form';

type LongTextWidgetProps = {
  field: ControllerRenderProps;
  placeholder?: string;
};

export function LongTextWidget({ field, placeholder }: LongTextWidgetProps) {
  return (
    <Textarea
      rows={4}
      placeholder={placeholder}
      value={(field.value as string) ?? ''}
      onBlur={field.onBlur}
      onChange={field.onChange}
      name={field.name}
      ref={field.ref}
      data-form-focus-target=""
    />
  );
}
