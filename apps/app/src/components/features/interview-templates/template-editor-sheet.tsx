import type { TipTapDoc } from '@comitium/schemas/common';
import { ORG_DEFAULT_FORM_VALUE } from '@comitium/schemas/forms/form-definitions';
import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import {
  useCreateInterviewTemplate,
  useUpdateInterviewTemplate,
} from '@/hooks/mutations/use-interview-template-mutations';
import { useQueryInterviewTemplateFeedbackFormOptions } from '@/hooks/queries/use-query-interview-templates';
import {
  type InterviewTemplate,
  interviewTemplateDurationMinutesFieldSchema,
  interviewTemplateExternalTitleFieldSchema,
  interviewTemplateTitleFieldSchema,
} from '@/lib/schemas/interview-templates';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180] as const;

const formSchema = z.object({
  title: interviewTemplateTitleFieldSchema,
  externalTitle: interviewTemplateExternalTitleFieldSchema.optional(),
  durationMinutes: interviewTemplateDurationMinutesFieldSchema,
  feedbackFormId: z.string(),
});

type FormData = z.infer<typeof formSchema>;

function getDefaults(template?: InterviewTemplate | null): FormData {
  if (template) {
    return {
      title: template.title,
      externalTitle: template.externalTitle ?? '',
      durationMinutes: template.durationMinutes,
      feedbackFormId: template.feedbackFormId ?? ORG_DEFAULT_FORM_VALUE,
    };
  }

  return {
    title: '',
    externalTitle: '',
    durationMinutes: 60,
    feedbackFormId: ORG_DEFAULT_FORM_VALUE,
  };
}

function getSubmitLabel(isPending: boolean, isCreate: boolean) {
  if (isPending) {
    return isCreate ? 'Creating...' : 'Saving...';
  }

  return isCreate ? 'Create' : 'Save changes';
}

type SheetMode = 'create' | 'edit';

interface TemplateEditorSheetProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SheetMode;
  template: InterviewTemplate | null;
}

export function TemplateEditorSheet({ orgId, open, onOpenChange, mode, template }: TemplateEditorSheetProps) {
  const isCreate = mode === 'create';
  const { mutate: createMutate, isPending: isCreating } = useCreateInterviewTemplate();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateInterviewTemplate();
  const { data: feedbackFormsList } = useQueryInterviewTemplateFeedbackFormOptions(orgId);
  const feedbackForms = feedbackFormsList?.data;
  const isPending = isCreating || isUpdating;
  const [instructions, setInstructions] = useState<TipTapDoc | null>(template?.instructions ?? null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaults(template),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(template));
      setInstructions(template?.instructions ?? null);
    }
  }, [open, template, form]);

  const handleSubmit = useCallback(
    (data: FormData) => {
      const externalTitle = data.externalTitle?.trim() || undefined;
      const instructionsValue = instructions && tipTapToPlainText(instructions).trim() ? instructions : null;
      const feedbackFormId = data.feedbackFormId === ORG_DEFAULT_FORM_VALUE ? null : data.feedbackFormId;

      if (isCreate) {
        createMutate(
          {
            orgId,
            body: {
              title: data.title,
              externalTitle,
              durationMinutes: data.durationMinutes,
              instructions: instructionsValue ?? undefined,
              feedbackFormId,
            },
          },
          {
            onSuccess: () => {
              onOpenChange(false);
            },
          },
        );
      } else if (template) {
        updateMutate(
          {
            orgId,
            id: template.id,
            body: {
              title: data.title,
              externalTitle: externalTitle ?? null,
              durationMinutes: data.durationMinutes,
              instructions: instructionsValue,
              feedbackFormId,
            },
          },
          {
            onSuccess: () => {
              onOpenChange(false);
            },
          },
        );
      }
    },
    [isCreate, template, orgId, instructions, createMutate, updateMutate, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleInstructionsUpdate = useCallback((document: TipTapDoc) => {
    setInstructions(document);
  }, []);

  const handleDurationChange = useCallback(
    (value: string) => {
      form.setValue('durationMinutes', Number(value), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const sheetTitle = isCreate ? 'New interview template' : 'Edit interview template';
  const sheetDescription = isCreate
    ? 'Reusable interviewer briefing and feedback form used when this interview is scheduled.'
    : 'Update the reusable briefing and feedback form for this interview type.';
  const submitLabel = getSubmitLabel(isPending, isCreate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FeatureSheetContent side="right" width="xl">
        <FeatureSheetHeader className="py-5">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </FeatureSheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <FeatureSheetBody className="flex min-h-0 flex-col gap-4 py-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technical Phone Screen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      External title <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Title shown to candidates" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select value={String(field.value)} onValueChange={handleDurationChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {DURATION_OPTIONS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} min
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label className="mb-1.5 block">
                  Instructions <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <RichTextEditor
                  key={`${mode}:${template?.id ?? 'new'}:${open}`}
                  content={instructions}
                  onUpdate={handleInstructionsUpdate}
                  debounceMs={0}
                  toolbar={<EditorToolbar />}
                  minHeightClass="min-h-72"
                  placeholder="Add interview briefing, questions, rubric notes, or signals to look for..."
                />
              </div>

              <FormField
                control={form.control}
                name="feedbackFormId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback form</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={ORG_DEFAULT_FORM_VALUE}>Use org default</SelectItem>
                          {(feedbackForms ?? []).map((feedbackForm) => (
                            <SelectItem key={feedbackForm.id} value={feedbackForm.id}>
                              {feedbackForm.isDefaultForm ? `${feedbackForm.title} (org default)` : feedbackForm.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </FeatureSheetBody>

            <FeatureSheetFooter stackOnMobile>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner data-icon="inline-start" />}
                {submitLabel}
              </Button>
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
