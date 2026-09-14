import { ORG_DEFAULT_FORM_VALUE } from '@comitium/schemas/forms/form-definitions';
import { Badge } from '@comitium/ui/badge';
import { Combobox } from '@comitium/ui/combobox';
import { FormControl } from '@comitium/ui/form';

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
  const options = [
    {
      value: ORG_DEFAULT_FORM_VALUE,
      label: defaultFormTitle,
      trailing: <Badge variant="secondary">Default</Badge>,
    },
    ...forms.filter((form) => !form.isDefaultForm).map((form) => ({ value: form.id, label: form.title })),
  ];

  return (
    <FormControl>
      <Combobox
        ariaLabel="Feedback form"
        options={options}
        value={selectedValue}
        clearable={false}
        onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}
        placeholder="Select a feedback form"
        searchPlaceholder="Search feedback forms…"
        emptyMessage="No feedback forms found."
      />
    </FormControl>
  );
}
