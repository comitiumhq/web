import { orderApplicationRequiredQuestionsFirst } from '@comitium/schemas/forms/application-required-fields';
import type { RenderableForm, RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import type { ComponentType } from 'react';
import type { Control, ControllerRenderProps, FieldValues } from 'react-hook-form';

import { ChoiceWidget } from './widgets/choice-widget';
import { CurrencyWidget } from './widgets/currency-widget';
import { DateWidget } from './widgets/date-widget';
import { FileWidget } from './widgets/file-widget';
import { type LocationInputProps, LocationWidget } from './widgets/location-widget';
import { LongTextWidget } from './widgets/long-text-widget';
import { RatingWidget } from './widgets/rating-widget';
import { ScoreWidget } from './widgets/score-widget';
import { TextWidget } from './widgets/text-widget';

export interface FormattableTextInputProps {
  name: string;
  value: string;
  placeholder?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export interface FormRendererProps {
  form: RenderableForm;
  control: Control<FieldValues>;
  locationInput: ComponentType<LocationInputProps>;
  formattableTextInput?: ComponentType<FormattableTextInputProps>;
  variant?: 'application';
}

export function FormRenderer({ form, control, locationInput, formattableTextInput, variant }: FormRendererProps) {
  const sections = form.sections.filter((section) => section.questions.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-4">
          {section.title && <h3 className="text-heading-16">{section.title}</h3>}
          <div className="flex flex-col gap-5">
            <SectionQuestions
              questions={section.questions}
              control={control}
              locationInput={locationInput}
              formattableTextInput={formattableTextInput}
              variant={variant}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

interface SectionQuestionsProps {
  questions: RenderableFormQuestion[];
  control: Control<FieldValues>;
  locationInput: ComponentType<LocationInputProps>;
  formattableTextInput?: ComponentType<FormattableTextInputProps>;
  variant?: 'application';
}

function SectionQuestions({ questions, control, locationInput, formattableTextInput, variant }: SectionQuestionsProps) {
  const orderedQuestions = variant === 'application' ? orderApplicationRequiredQuestionsFirst(questions) : questions;
  const [firstNameQuestion, lastNameQuestion, ...remainingQuestions] = orderedQuestions;
  const hasCandidateNameRow =
    variant === 'application' &&
    firstNameQuestion?.config?.candidateProfileField === 'first_name' &&
    lastNameQuestion?.config?.candidateProfileField === 'last_name';

  if (!hasCandidateNameRow) {
    return (
      <QuestionFields
        questions={orderedQuestions}
        control={control}
        locationInput={locationInput}
        formattableTextInput={formattableTextInput}
      />
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <QuestionField
          question={firstNameQuestion}
          control={control}
          locationInput={locationInput}
          formattableTextInput={formattableTextInput}
        />
        <QuestionField
          question={lastNameQuestion}
          control={control}
          locationInput={locationInput}
          formattableTextInput={formattableTextInput}
        />
      </div>
      <QuestionFields
        questions={remainingQuestions}
        control={control}
        locationInput={locationInput}
        formattableTextInput={formattableTextInput}
      />
    </>
  );
}

function QuestionFields({
  questions,
  control,
  locationInput,
  formattableTextInput,
}: Omit<SectionQuestionsProps, 'variant'>) {
  return (
    <>
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          control={control}
          locationInput={locationInput}
          formattableTextInput={formattableTextInput}
        />
      ))}
    </>
  );
}

interface QuestionFieldProps {
  question: RenderableFormQuestion;
  control: Control<FieldValues>;
  locationInput: ComponentType<LocationInputProps>;
  formattableTextInput?: ComponentType<FormattableTextInputProps>;
}

function QuestionField({ question, control, locationInput, formattableTextInput }: QuestionFieldProps) {
  return (
    <FormField
      control={control}
      name={question.id}
      render={({ field }) => (
        <FormItem data-form-question-id={question.id}>
          <FormLabel>
            {question.prompt}
            {question.isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FormLabel>
          {question.description && <FormDescription>{question.description}</FormDescription>}
          <FormControl>
            <QuestionWidget
              question={question}
              field={field}
              locationInput={locationInput}
              formattableTextInput={formattableTextInput}
              placeholder={getFormPlaceholder(question.questionType)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface QuestionWidgetProps {
  question: RenderableFormQuestion;
  field: ControllerRenderProps;
  locationInput: ComponentType<LocationInputProps>;
  formattableTextInput?: ComponentType<FormattableTextInputProps>;
  placeholder?: string;
}

function QuestionWidget({ question, field, locationInput, formattableTextInput, placeholder }: QuestionWidgetProps) {
  switch (question.questionType) {
    case 'short_answer':
    case 'email':
    case 'phone':
    case 'url':
    case 'number':
      return <TextWidget question={question} field={field} placeholder={placeholder} />;

    case 'currency':
      return <CurrencyWidget field={field} />;

    case 'candidate_location':
    case 'location':
      return <LocationWidget field={field} input={locationInput} />;

    case 'long_unformatted':
      return <LongTextWidget field={field} placeholder={placeholder} />;

    case 'long_formattable': {
      const FormattableTextInput = formattableTextInput;

      if (!FormattableTextInput) {
        return <LongTextWidget field={field} placeholder={placeholder} />;
      }

      return (
        <FormattableTextInput
          name={field.name}
          value={(field.value as string | undefined) ?? ''}
          placeholder={placeholder}
          onBlur={field.onBlur}
          onChange={field.onChange}
        />
      );
    }

    case 'multiple_choice':
    case 'checkboxes':
    case 'yes_no':
      return <ChoiceWidget question={question} field={field} />;

    case 'date':
      return <DateWidget field={field} />;

    case 'linear_rating':
    case 'nps_rating':
      return <RatingWidget question={question} field={field} />;

    case 'score':
      return <ScoreWidget field={field} />;

    case 'resume':
    case 'file':
      return <FileWidget question={question} field={field} />;

    default:
      return null;
  }
}

const PLACEHOLDER_BY_QUESTION_TYPE: Partial<Record<RenderableFormQuestion['questionType'], string>> = {
  short_answer: 'Type your answer...',
  long_unformatted: 'Type your answer...',
  long_formattable: 'Type your answer...',
  email: 'name@example.com',
  phone: '+1 555 000 0000',
  url: 'https://example.com',
  number: 'Enter a number',
};

function getFormPlaceholder(questionType: RenderableFormQuestion['questionType']): string | undefined {
  return PLACEHOLDER_BY_QUESTION_TYPE[questionType];
}
