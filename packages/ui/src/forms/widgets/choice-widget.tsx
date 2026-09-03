import type { RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { Checkbox } from '@comitium/ui/checkbox';
import { Label } from '@comitium/ui/label';
import { RadioGroup, RadioGroupItem } from '@comitium/ui/radio-group';
import { memo, useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

type ChoiceWidgetProps = {
  question: RenderableFormQuestion;
  field: ControllerRenderProps;
};

const YES_NO_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];
const CHOICE_CONTROL_CLASS_NAME = 'size-5';
const CHOICE_ROW_CLASS_NAME = 'flex items-center gap-2';

function getYesNoValue(value: unknown) {
  if (value === true) {
    return 'yes';
  }

  if (value === false) {
    return 'no';
  }

  return '';
}

export function ChoiceWidget({ question, field }: ChoiceWidgetProps) {
  if (question.questionType === 'yes_no') {
    return <YesNoChoice question={question} field={field} />;
  }

  if (question.questionType === 'checkboxes') {
    return <CheckboxesChoice question={question} field={field} />;
  }

  return <MultipleChoice question={question} field={field} />;
}

function YesNoChoice({ question, field }: ChoiceWidgetProps) {
  const value = getYesNoValue(field.value);

  const handleChange = useCallback(
    (next: string) => {
      field.onChange(next === 'yes');
    },
    [field],
  );

  return (
    <RadioGroup value={value} onValueChange={handleChange} name={field.name}>
      {YES_NO_OPTIONS.map((opt, index) => (
        <div key={opt.value} className={CHOICE_ROW_CLASS_NAME}>
          <RadioGroupItem
            value={opt.value}
            id={`${question.id}-${opt.value}`}
            className={CHOICE_CONTROL_CLASS_NAME}
            data-form-focus-target={index === 0 ? '' : undefined}
          />
          <Label htmlFor={`${question.id}-${opt.value}`} className="text-label-14 font-normal">
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function MultipleChoice({ question, field }: ChoiceWidgetProps) {
  return (
    <RadioGroup value={(field.value as string) ?? ''} onValueChange={field.onChange} name={field.name}>
      {question.selectableValues?.map((opt, index) => (
        <div key={opt.value} className={CHOICE_ROW_CLASS_NAME}>
          <RadioGroupItem
            value={opt.value}
            id={`${question.id}-${opt.value}`}
            className={CHOICE_CONTROL_CLASS_NAME}
            data-form-focus-target={index === 0 ? '' : undefined}
          />
          <Label htmlFor={`${question.id}-${opt.value}`} className="text-label-14 font-normal">
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

function CheckboxesChoice({ question, field }: ChoiceWidgetProps) {
  const selected = Array.isArray(field.value) ? (field.value as string[]) : [];

  const handleToggle = useCallback(
    (value: string, checked: boolean) => {
      const next = checked ? [...selected, value] : selected.filter((v) => v !== value);

      field.onChange(next);
    },
    [selected, field],
  );

  return (
    <div className="flex flex-col gap-2">
      {question.selectableValues?.map((opt, index) => (
        <CheckboxItem
          key={opt.value}
          id={`${question.id}-${opt.value}`}
          value={opt.value}
          label={opt.label}
          isChecked={selected.includes(opt.value)}
          onToggle={handleToggle}
          isFormFocusTarget={index === 0}
        />
      ))}
    </div>
  );
}

interface CheckboxItemProps {
  id: string;
  value: string;
  label: string;
  isChecked: boolean;
  isFormFocusTarget: boolean;
  onToggle: (value: string, checked: boolean) => void;
}

const CheckboxItem = memo(function CheckboxItem({
  id,
  value,
  label,
  isChecked,
  isFormFocusTarget,
  onToggle,
}: CheckboxItemProps) {
  const handleCheckedChange = useCallback(
    (c: boolean | 'indeterminate') => onToggle(value, c === true),
    [value, onToggle],
  );

  return (
    <div className={CHOICE_ROW_CLASS_NAME}>
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        className={CHOICE_CONTROL_CLASS_NAME}
        data-form-focus-target={isFormFocusTarget ? '' : undefined}
      />
      <Label htmlFor={id} className="text-label-14 font-normal">
        {label}
      </Label>
    </div>
  );
});
