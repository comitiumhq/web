import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import type { SearchSelectOption } from '@comitium/ui/search-select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { EnvelopeSimpleIcon, WarningIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  EmailDeliverySummary,
  EmailMessageField,
  EmailTemplateField,
  getEmailSenderLabel,
} from '@/components/features/candidate-communication/email-composer-fields';
import type { RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useEmailTemplateSelector } from '@/hooks/use-email-template-selector';
import type { ComposeEmailData } from '@/lib/schemas/emails';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { appendSignature, containsUnresolvedTemplateToken } from '@/lib/utils/email-tokens';

const emailSheetSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
});

type EmailSheetFormData = z.infer<typeof emailSheetSchema>;

interface EmailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSending: boolean;
  onSubmit: (data: ComposeEmailData) => void;
  applicationId: string;
  orgId: string;
  candidateEmail: string | null;
  candidateFirstName?: string | null;
  jobTitle: string | null;
  activityId?: string;
  preselectedTemplateId?: string;
}

export function EmailSheet({
  open,
  onOpenChange,
  isSending,
  onSubmit,
  applicationId,
  orgId,
  candidateEmail,
  candidateFirstName,
  jobTitle,
  activityId,
  preselectedTemplateId,
}: EmailSheetProps) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const [preselectionApplied, setPreselectionApplied] = useState(false);

  const form = useForm<EmailSheetFormData>({
    resolver: zodResolver(emailSheetSchema),
    defaultValues: { subject: '' },
    mode: 'onChange',
  });

  const {
    templates,
    selectedTemplate,
    templatesReady,
    templatesError,
    selectedTemplateId,
    messageDoc,
    resolvedSubject,
    emailSignature,
    senderName,
    handleTemplateChange,
    reset: resetTemplate,
  } = useEmailTemplateSelector({
    applicationId,
    orgId,
    enabled: open,
    candidateFirstName,
    jobTitle,
    activityId,
  });

  const editorContent = useMemo(() => appendSignature(messageDoc, emailSignature), [messageDoc, emailSignature]);
  const signatureText = useMemo(
    () => (emailSignature ? tipTapToPlainText(emailSignature).trim() : ''),
    [emailSignature],
  );
  const subject = form.watch('subject');
  const subjectHasUnresolvedToken = containsUnresolvedTemplateToken(subject);
  const canSubmit = Boolean(candidateEmail) && form.formState.isValid && !subjectHasUnresolvedToken;
  const senderLabel = getEmailSenderLabel(senderName);

  const templateOptions = useMemo(() => {
    const options: SearchSelectOption[] = templates.map((template) => ({
      value: template.id,
      label: template.name,
      searchValue: `${template.name} ${template.useCase}`,
    }));

    if (selectedTemplate?.isArchived && !options.some((option) => option.value === selectedTemplate.id)) {
      options.unshift({
        value: selectedTemplate.id,
        label: selectedTemplate.name,
        trailing: 'Archived',
        disabled: true,
      });
    }

    return options;
  }, [selectedTemplate, templates]);

  let templatePlaceholder = 'Select a template (optional)';

  if (templatesError) {
    templatePlaceholder = 'Templates unavailable';
  } else if (templateOptions.length === 0) {
    templatePlaceholder = 'No templates available';
  }

  useEffect(() => {
    if (resolvedSubject) {
      form.setValue('subject', resolvedSubject, { shouldDirty: true, shouldValidate: true });
    }
  }, [resolvedSubject, form]);

  useEffect(() => {
    if (!open) {
      form.reset({ subject: '' });
      resetTemplate();
      setPreselectionApplied(false);
    }
  }, [open, resetTemplate, form]);

  useEffect(() => {
    if (open && preselectedTemplateId && templatesReady && !preselectionApplied) {
      handleTemplateChange(preselectedTemplateId);
      setPreselectionApplied(true);
    }
  }, [open, preselectedTemplateId, templatesReady, preselectionApplied, handleTemplateChange]);

  const handleTemplateValueChange = useCallback(
    (templateId: string | null) => {
      if (templateId) {
        handleTemplateChange(templateId);
      }
    },
    [handleTemplateChange],
  );

  const handleSubmit = useCallback(
    (data: EmailSheetFormData) => {
      const editor = editorRef.current;

      if (!candidateEmail) {
        toast.error('Candidate email is unavailable');

        return;
      }

      const bodyText = editor?.getText().trim();

      if (!editor || !bodyText || bodyText === signatureText) {
        toast.error('Please enter a message');

        return;
      }

      const messageDoc = editor.getJSON();

      if (
        containsUnresolvedTemplateToken(data.subject) ||
        containsUnresolvedTemplateToken(tipTapToPlainText(messageDoc))
      ) {
        toast.error('Replace unresolved template values before sending');

        return;
      }

      const emailData: ComposeEmailData = {
        messageDoc,
        messageHtml: editor.getHTML(),
        subject: data.subject,
      };

      if (selectedTemplateId) {
        emailData.emailTemplateId = selectedTemplateId;
      }

      onSubmit(emailData);
    },
    [candidateEmail, onSubmit, selectedTemplateId, signatureText],
  );

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isSending) {
        onOpenChange(nextOpen);
      }
    },
    [isSending, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <FeatureSheetContent ref={sheetContentRef} width="2xl">
        <FeatureSheetHeader className="border-b-0">
          <SheetTitle className="text-heading-20">Email candidate</SheetTitle>
          <SheetDescription>Compose and review the message before sending.</SheetDescription>
        </FeatureSheetHeader>

        <Form {...form}>
          <form
            id="candidate-email-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FeatureSheetBody className="flex flex-col gap-5">
              {!candidateEmail && (
                <Alert variant="warning">
                  <WarningIcon />
                  <AlertTitle>Candidate email unavailable</AlertTitle>
                  <AlertDescription>Unlock candidate data or add an email address before sending.</AlertDescription>
                </Alert>
              )}

              <EmailDeliverySummary sender={senderLabel} recipient={candidateEmail ?? 'Unavailable'} />

              <EmailTemplateField
                options={templateOptions}
                value={selectedTemplateId || null}
                onValueChange={handleTemplateValueChange}
                placeholder={templatePlaceholder}
                emptyMessage="No templates found."
                loading={!templatesReady}
                disabled={isSending || templatesError || templateOptions.length === 0}
                errorMessage={
                  templatesError
                    ? 'Templates could not be loaded. You can still compose a message manually.'
                    : undefined
                }
                portalContainerRef={sheetContentRef}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Email subject..." disabled={isSending} {...field} />
                    </FormControl>
                    <FormMessage />
                    {subjectHasUnresolvedToken && (
                      <p className="text-copy-12 text-destructive">
                        Replace unresolved template values before sending.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <EmailMessageField content={editorContent} handleRef={editorRef} disabled={isSending} />
            </FeatureSheetBody>

            <FeatureSheetFooter className="border-t-0">
              <Button variant="outline" onClick={handleCancel} disabled={isSending} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isSending || !canSubmit}>
                {isSending ? <Spinner data-icon="inline-start" /> : <EnvelopeSimpleIcon data-icon="inline-start" />}
                {isSending ? 'Sending...' : 'Send email'}
              </Button>
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
