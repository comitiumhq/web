import { Button } from '@comitium/ui/button';
import { Checkbox } from '@comitium/ui/checkbox';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ArchiveReasonSelect } from '@/components/features/archive-reasons/archive-reason-select';
import { ARCHIVE_REASON_OUTCOME_LABELS } from '@/components/features/archive-reasons/labels';
import {
  EmailDeliverySummary,
  EmailMessageField,
  EmailTemplateField,
  getEmailSenderLabel,
} from '@/components/features/candidate-communication/email-composer-fields';
import type { RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useQueryArchiveReasonsList } from '@/hooks/queries/use-query-archive-reasons-list';
import { useEmailTemplateSelector } from '@/hooks/use-email-template-selector';
import type { ComposeEmailData } from '@/lib/schemas/emails';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { appendSignature, containsUnresolvedTemplateToken } from '@/lib/utils/email-tokens';

const archiveFormSchema = z.object({
  archiveReasonId: z.string().min(1, 'Please select a reason'),
  subject: z.string(),
});

type ArchiveFormData = z.infer<typeof archiveFormSchema>;

export interface ArchiveApplicationFormData {
  action: 'archive';
  archiveReasonId: string;
  notice: ComposeEmailData | null;
}

interface ArchiveApplicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (data: ArchiveApplicationFormData) => void;
  applicationId: string;
  orgId: string;
  candidateEmail: string | null;
  candidateFirstName?: string | null;
  jobTitle: string | null;
  canSendEmail: boolean;
}

export function ArchiveApplicationSheet({
  open,
  onOpenChange,
  isPending,
  onSubmit,
  applicationId,
  orgId,
  candidateEmail,
  candidateFirstName,
  jobTitle,
  canSendEmail,
}: ArchiveApplicationSheetProps) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const [shouldSendEmail, setShouldSendEmail] = useState(false);
  const {
    data: reasonsResponse,
    isLoading: isLoadingReasons,
    isError: reasonsQueryError,
  } = useQueryArchiveReasonsList(orgId);
  const reasons = reasonsResponse?.data ?? [];
  const reasonsUnavailable = reasonsQueryError && reasons.length === 0;
  const form = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveFormSchema),
    defaultValues: {
      archiveReasonId: '',
      subject: '',
    },
  });
  const archiveReasonId = form.watch('archiveReasonId');
  const subject = form.watch('subject');
  const selectedReason = useMemo(
    () => reasons.find((reason) => reason.id === archiveReasonId) ?? null,
    [archiveReasonId, reasons],
  );
  const sendsEmail = canSendEmail && shouldSendEmail;
  const {
    templates,
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
    enabled: open && canSendEmail,
    candidateFirstName,
    jobTitle,
  });
  const editorContent = useMemo(() => appendSignature(messageDoc, emailSignature), [emailSignature, messageDoc]);
  const reasonOptions = useMemo(
    () =>
      reasons.map((reason) => ({
        value: reason.id,
        label: reason.label,
        description: ARCHIVE_REASON_OUTCOME_LABELS[reason.outcome],
        searchValue: `${reason.label} ${ARCHIVE_REASON_OUTCOME_LABELS[reason.outcome]}`,
      })),
    [reasons],
  );
  const templateOptions = useMemo(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: template.name,
        searchValue: template.name,
      })),
    [templates],
  );
  const subjectHasUnresolvedToken = containsUnresolvedTemplateToken(subject);
  const hasValidReason = selectedReason !== null && !reasonsUnavailable;
  const canSubmitEmail = Boolean(candidateEmail) && subject.trim().length > 0 && !subjectHasUnresolvedToken;
  const canSubmit = hasValidReason && (!sendsEmail || canSubmitEmail);
  const senderLabel = getEmailSenderLabel(senderName);

  let reasonPlaceholder = 'Select a reason';

  if (isLoadingReasons) {
    reasonPlaceholder = 'Loading reasons...';
  } else if (reasonsUnavailable) {
    reasonPlaceholder = 'Reasons unavailable';
  }

  let templatePlaceholder = 'Select a template';

  if (templatesError) {
    templatePlaceholder = 'Templates unavailable';
  } else if (templateOptions.length === 0) {
    templatePlaceholder = 'No matching templates';
  }

  useEffect(() => {
    if (resolvedSubject) {
      form.setValue('subject', resolvedSubject, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, resolvedSubject]);

  useEffect(() => {
    if (open) {
      form.reset({
        archiveReasonId: '',
        subject: '',
      });

      setShouldSendEmail(false);
      resetTemplate();
    }
  }, [form, open, resetTemplate]);

  const handleReasonChange = useCallback(
    (value: string | null) => {
      if (!value || value === archiveReasonId) {
        return;
      }

      form.setValue('archiveReasonId', value, { shouldDirty: true, shouldValidate: true });
    },
    [archiveReasonId, form],
  );

  const handleTemplateValueChange = useCallback(
    (templateId: string | null) => {
      if (templateId) {
        handleTemplateChange(templateId);
      }
    },
    [handleTemplateChange],
  );

  const handleSubmit = useCallback(
    (data: ArchiveFormData) => {
      if (!sendsEmail) {
        onSubmit({
          action: 'archive',
          archiveReasonId: data.archiveReasonId,
          notice: null,
        });

        return;
      }

      if (!candidateEmail) {
        toast.error('Candidate email is unavailable');

        return;
      }

      if (!data.subject.trim()) {
        form.setError('subject', { message: 'Subject is required' });

        return;
      }

      const editor = editorRef.current;

      if (!editor || editor.isEmpty()) {
        toast.error('Please enter a message');

        return;
      }

      const messageDoc = editor.getJSON();

      if (
        containsUnresolvedTemplateToken(data.subject) ||
        containsUnresolvedTemplateToken(tipTapToPlainText(messageDoc))
      ) {
        toast.error('Replace unresolved template values before archiving');

        return;
      }

      const notice: ComposeEmailData = {
        subject: data.subject.trim(),
        messageDoc,
        messageHtml: editor.getHTML(),
        emailTemplateId: selectedTemplateId || undefined,
      };

      onSubmit({ action: 'archive', archiveReasonId: data.archiveReasonId, notice });
    },
    [candidateEmail, form, onSubmit, selectedTemplateId, sendsEmail],
  );

  const handleSendEmailChange = useCallback(
    (checked: boolean) => {
      setShouldSendEmail(checked);

      if (!checked) {
        form.clearErrors('subject');
      }
    },
    [form],
  );

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        onOpenChange(nextOpen);
      }
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <FeatureSheetContent ref={sheetContentRef} size="form">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Archive application</SheetTitle>
          <SheetDescription>Choose a reason for archiving this application.</SheetDescription>
        </FeatureSheetHeader>

        <Form {...form}>
          <form
            id="archive-application-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FeatureSheetBody className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="archiveReasonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <ArchiveReasonSelect
                        options={reasonOptions}
                        value={field.value || null}
                        onValueChange={handleReasonChange}
                        placeholder={reasonPlaceholder}
                        disabled={isPending || isLoadingReasons || reasonsUnavailable}
                        portalContainerRef={sheetContentRef}
                      />
                    </FormControl>
                    <FormMessage />
                    {reasonsUnavailable && (
                      <p className="text-copy-12 text-destructive">Archive reasons could not be loaded.</p>
                    )}
                  </FormItem>
                )}
              />

              {canSendEmail && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="archive-send-email"
                    checked={sendsEmail}
                    onCheckedChange={(checked) => handleSendEmailChange(checked === true)}
                    disabled={isPending || !candidateEmail}
                    aria-controls="archive-email-fields"
                    aria-expanded={sendsEmail}
                  />
                  <Label htmlFor="archive-send-email" className="font-normal leading-5">
                    Send email
                  </Label>
                </div>
              )}
              <div id="archive-email-fields" hidden={!sendsEmail} className="space-y-5">
                <EmailDeliverySummary sender={senderLabel} recipient={candidateEmail ?? 'Unavailable'} />

                <EmailTemplateField
                  label="Email template"
                  options={templateOptions}
                  value={selectedTemplateId || null}
                  onValueChange={handleTemplateValueChange}
                  placeholder={templatePlaceholder}
                  emptyMessage="No matching templates found."
                  loading={!templatesReady}
                  disabled={isPending || templatesError || templateOptions.length === 0}
                  errorMessage={
                    templatesError
                      ? 'Templates could not be loaded. You can still compose the email manually.'
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
                        <Input placeholder="Email subject..." disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                      {subjectHasUnresolvedToken && (
                        <p className="text-copy-12 text-destructive">
                          Replace unresolved template values before archiving.
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <EmailMessageField content={editorContent} handleRef={editorRef} disabled={isPending} />
              </div>
            </FeatureSheetBody>

            <FeatureSheetFooter>
              <Button variant="outline" onClick={handleCancel} disabled={isPending} type="button">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending || !canSubmit}>
                {isPending && <Spinner data-icon="inline-start" />}
                {!isPending && <ArchiveIcon data-icon="inline-start" />}
                {isPending ? 'Archiving...' : 'Archive'}
              </Button>
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
