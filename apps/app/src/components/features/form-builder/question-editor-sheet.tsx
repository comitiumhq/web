import type { FormClass } from '@comitium/schemas/forms';
import { Button } from '@comitium/ui/button';
import { Checkbox } from '@comitium/ui/checkbox';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { Textarea } from '@comitium/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { InfoIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  FORM_DEFAULTS,
  type FormBuilderQuestion,
  isChoiceType,
  type QuestionFormData,
  questionFormSchema,
  selectableValuesToOptions,
} from './question-form';
import { QuestionOptionsEditor } from './question-options-editor';
import { getQuestionTypeOptions } from './question-type-options';

const COPY: Partial<Record<FormClass, { sheetDescription: string; requiredHelp: string }>> = {
  application: {
    sheetDescription: 'Configure how this question appears on the apply page.',
    requiredHelp: 'Candidates must answer this question to submit.',
  },
  feedback: {
    sheetDescription: 'Configure how this question appears in the interviewer feedback form.',
    requiredHelp: 'Interviewers must answer this question to submit feedback.',
  },
};

const DEFAULT_COPY = {
  sheetDescription: 'Configure how this question appears in the form.',
  requiredHelp: 'Respondents must answer this question to submit.',
};

function getSheetTitle(isLocked: boolean, isEdit: boolean) {
  if (isLocked) {
    return 'System question';
  }

  return isEdit ? 'Edit question' : 'New question';
}

export type QuestionEditorState = { mode: 'create' } | { mode: 'edit'; question: FormBuilderQuestion };

interface QuestionEditorSheetProps {
  formClass: FormClass;
  state: QuestionEditorState | null;
  onClose: () => void;
  onSubmit: (data: QuestionFormData) => void;
  isPending: boolean;
}

export function QuestionEditorSheet({ formClass, state, onClose, onSubmit, isPending }: QuestionEditorSheetProps) {
  const typeOptions = useMemo(() => getQuestionTypeOptions(formClass), [formClass]);

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: FORM_DEFAULTS,
  });

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.mode === 'edit') {
      form.reset({
        questionType: state.question.questionType,
        prompt: state.question.prompt,
        description: state.question.description ?? '',
        isRequired: state.question.isRequired,
        isPrivate: state.question.isPrivate,
        options: selectableValuesToOptions(state.question.selectableValues),
      });
    } else {
      form.reset(FORM_DEFAULTS);
    }
  }, [state, form]);

  const fieldType = form.watch('questionType');
  const needsOptions = isChoiceType(fieldType);

  useEffect(() => {
    if (!needsOptions && form.getValues('options').length > 0) {
      form.setValue('options', []);
    }
  }, [needsOptions, form]);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.stopPropagation();
      form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit],
  );

  const isOpen = state !== null;
  const isEdit = state?.mode === 'edit';
  const isLocked = isEdit && state.question.isLocked === true;
  const isLinkedReusableField = isEdit && state.question.reusableFieldId !== null;
  const inputsDisabled = isPending || isLocked;
  const copy = COPY[formClass] ?? DEFAULT_COPY;
  const sheetTitle = getSheetTitle(isLocked, isEdit);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <FeatureSheetContent width="full-xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{sheetTitle}</SheetTitle>
          <SheetDescription>
            {isLocked ? 'Managed by Comitium. This question can’t be edited or removed.' : copy.sheetDescription}
          </SheetDescription>
        </FeatureSheetHeader>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
            <FeatureSheetBody className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="questionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEdit || isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEdit ? (
                      <FormDescription>Type can&apos;t be changed after creation.</FormDescription>
                    ) : (
                      <FormDescription>{typeOptions.find((o) => o.id === field.value)?.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Years of experience" disabled={inputsDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Help text shown under the question"
                        rows={3}
                        disabled={inputsDisabled}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsOptions && (
                <QuestionOptionsEditor control={form.control} disabled={inputsDisabled || isLinkedReusableField} />
              )}

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={inputsDisabled} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Required</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        {copy.requiredHelp}
                      </TooltipContent>
                    </Tooltip>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={inputsDisabled || isLinkedReusableField}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Private</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        Private field. Only organization admins can view it.
                      </TooltipContent>
                    </Tooltip>
                  </FormItem>
                )}
              />
            </FeatureSheetBody>

            <FeatureSheetFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                {isLocked ? 'Close' : 'Cancel'}
              </Button>
              {!isLocked && (
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner data-icon="inline-start" />}
                  {isEdit ? 'Save changes' : 'Add question'}
                </Button>
              )}
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
