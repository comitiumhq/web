import { ORG_DEFAULT_FORM_VALUE } from '@comitium/schemas/forms/form-definitions';
import { Badge } from '@comitium/ui/badge';
import { FormControl } from '@comitium/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';

interface FeedbackFormOption {
  id: string;
  title: string;
  isDefaultForm: boolean;
}

interface FeedbackFormSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  forms: FeedbackFormOption[];
}

export function resolveFeedbackFormId(value: string) {
  return value === ORG_DEFAULT_FORM_VALUE ? null : value;
}

export function FeedbackFormSelect({ value, onValueChange, forms }: FeedbackFormSelectProps) {
  const defaultForm = forms.find((form) => form.isDefaultForm);
  const defaultFormTitle = defaultForm?.title ?? 'Default feedback form';
  const selectedValue = value === defaultForm?.id ? ORG_DEFAULT_FORM_VALUE : value;

  return (
    <Select value={selectedValue} onValueChange={onValueChange}>
      <FormControl>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value={ORG_DEFAULT_FORM_VALUE} textValue={`${defaultFormTitle} (default)`}>
          {defaultFormTitle}
          <Badge variant="secondary" aria-hidden="true">
            Default
          </Badge>
        </SelectItem>
        {forms
          .filter((form) => !form.isDefaultForm)
          .map((form) => (
            <SelectItem key={form.id} value={form.id}>
              {form.title}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
