import type { TipTapDoc } from '@comitium/schemas/common';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { Separator } from '@/components/tiptap-ui-primitive/separator';
import { useCreateEmailTemplate, useUpdateEmailTemplate } from '@/hooks/mutations/use-email-template';
import { type EmailTemplateResponse, emailTemplateUseCaseSchema } from '@/lib/schemas/emails';
import { normalizeTokensInDoc } from '@/lib/tiptap/normalize-tokens';

import { EMAIL_TEMPLATE_USE_CASE_LABELS } from './labels';
import { TokenPopover } from './token-popover';

type DialogMode = 'edit' | 'create';

const templateFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  subject: z.string().trim().min(1, 'Subject is required').max(500),
  useCase: emailTemplateUseCaseSchema,
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

function getSubmitLabel(isPending: boolean, isCreate: boolean) {
  if (isPending) {
    return isCreate ? 'Creating...' : 'Saving...';
  }

  return isCreate ? 'Create template' : 'Save';
}

interface TemplateEditorSheetProps {
  orgId: string;
  open: boolean;
  mode: DialogMode;
  template: EmailTemplateResponse | null;
  onClose: () => void;
}

export function TemplateEditorSheet({ orgId, open, mode, template, onClose }: TemplateEditorSheetProps) {
  const isCreate = mode === 'create';
  const { mutate: createMutate, isPending: isCreating } = useCreateEmailTemplate();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateEmailTemplate();
  const isPending = isCreating || isUpdating;

  const editorRef = useRef<RichTextEditorHandle | null>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: '', subject: '', useCase: 'general' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (template) {
      form.reset({ name: template.name, subject: template.subject, useCase: template.useCase });
    } else {
      form.reset({ name: '', subject: '', useCase: 'general' });
    }
  }, [open, template, form]);

  const onSubmit = useCallback(
    (data: TemplateFormData) => {
      const body = editorRef.current?.getJSON() as TipTapDoc;

      if (template && mode === 'edit') {
        updateMutate(
          {
            orgId,
            templateId: template.id,
            body: { name: data.name, subject: data.subject, body, useCase: data.useCase },
          },
          { onSuccess: onClose },
        );
      } else {
        createMutate(
          { orgId, body: { name: data.name, subject: data.subject, body, useCase: data.useCase } },
          { onSuccess: onClose },
        );
      }
    },
    [mode, template, orgId, createMutate, updateMutate, onClose],
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!isPending && !v) {
        onClose();
      }
    },
    [isPending, onClose],
  );

  const bodyContent = template?.body ? normalizeTokensInDoc(template.body) : null;

  const title = isCreate ? 'New email template' : 'Edit email template';
  const description = 'Reusable candidate emails that can include job, company, and sender tokens.';
  const submitLabel = getSubmitLabel(isPending, isCreate);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="2xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id="template-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Standard Rejection" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useCase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Use case</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EMAIL_TEMPLATE_USE_CASE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Update on your application for {{job_title}}"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label className="mb-1.5 block">Body</Label>
                <RichTextEditor
                  content={bodyContent}
                  handleRef={editorRef}
                  toolbar={
                    <EditorToolbar>
                      <Separator />
                      <TokenPopover orgId={orgId} />
                    </EditorToolbar>
                  }
                  minHeightClass="min-h-72"
                  placeholder="Write your email template..."
                />
              </div>
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="template-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
