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
import { Label } from '@comitium/ui/label';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { Switch } from '@comitium/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveIcon, WarningIcon } from '@phosphor-icons/react';
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
import type { ArchiveReasonOutcome } from '@/lib/schemas/archive-reasons';
import type { ComposeEmailData, EmailTemplateUseCase } from '@/lib/schemas/emails';
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
  isResponded: boolean;
  canSendEmail: boolean;
}

const OUTCOME_TEMPLATE_USE_CASE: Record<ArchiveReasonOutcome, EmailTemplateUseCase> = {
  employer_rejected: 'rejection',
  candidate_withdrew: 'application_withdrew',
  candidate_unresponsive: 'application_unresponsive',
};

function getArchiveSubmitLabel(isPending: boolean, sendsEmail: boolean): string {
  if (isPending) {
    return 'Archiving...';
  }

  if (sendsEmail) {
    return 'Archive & send email';
  }

  return 'Archive application';
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
  isResponded,
  canSendEmail,
}: ArchiveApplicationSheetProps) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const [shouldSendEmail, setShouldSendEmail] = useState(!isResponded);
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
    mode: 'onChange',
  });
  const archiveReasonId = form.watch('archiveReasonId');
  const subject = form.watch('subject');
  const emailIsRequired = !isResponded;
  const showEmailFields = emailIsRequired || (canSendEmail && shouldSendEmail);
  const selectedReason = useMemo(
    () => reasons.find((reason) => reason.id === archiveReasonId) ?? null,
    [archiveReasonId, reasons],
  );
  const useCase = selectedReason ? OUTCOME_TEMPLATE_USE_CASE[selectedReason.outcome] : undefined;
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
    enabled: open && showEmailFields && selectedReason !== null,
    candidateFirstName,
    jobTitle,
    useCase,
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
  const canSubmit =
    selectedReason !== null &&
    !reasonsUnavailable &&
    (!showEmailFields || (Boolean(candidateEmail) && subject.trim().length > 0 && !subjectHasUnresolvedToken));
  const submitLabel = getArchiveSubmitLabel(isPending, showEmailFields);
  const senderLabel = getEmailSenderLabel(senderName);
  const description = emailIsRequired
    ? 'Choose a reason, then review the required candidate email.'
    : 'Choose a reason for archiving this application.';

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
    if (!open) {
      form.reset({
        archiveReasonId: '',
        subject: '',
      });
      setShouldSendEmail(!isResponded);
      resetTemplate();
    }
  }, [form, isResponded, open, resetTemplate]);

  const handleReasonChange = useCallback(
    (value: string | null) => {
      form.setValue('archiveReasonId', value ?? '', { shouldDirty: true, shouldValidate: true });
      form.setValue('subject', '');
      resetTemplate();
    },
    [form, resetTemplate],
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
      if (!showEmailFields) {
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
    [candidateEmail, form, onSubmit, selectedTemplateId, showEmailFields],
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
      <FeatureSheetContent ref={sheetContentRef} width="2xl">
        <FeatureSheetHeader className="border-b-0">
          <SheetTitle className="text-heading-20">Archive application</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </FeatureSheetHeader>

        <Form {...form}>
          <form
            id="archive-application-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FeatureSheetBody className="flex flex-col gap-5">
              {isResponded && canSendEmail && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
                  <div>
                    <Label htmlFor="archive-send-email">Send email to candidate</Label>
                    <p className="text-copy-12 text-muted-foreground">
                      Optional because this application has already received a response.
                    </p>
                  </div>
                  <Switch
                    id="archive-send-email"
                    checked={shouldSendEmail}
                    onCheckedChange={handleSendEmailChange}
                    disabled={isPending || !candidateEmail}
                  />
                </div>
              )}

              {showEmailFields && (
                <>
                  {!candidateEmail && (
                    <Alert variant="warning">
                      <WarningIcon />
                      <AlertTitle>Candidate email unavailable</AlertTitle>
                      <AlertDescription>
                        Unlock candidate data or add an email address before archiving.
                      </AlertDescription>
                    </Alert>
                  )}

                  <EmailDeliverySummary sender={senderLabel} recipient={candidateEmail ?? 'Unavailable'} />
                </>
              )}

              <div className={showEmailFields ? 'grid gap-5 sm:grid-cols-2' : undefined}>
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

                {showEmailFields && (
                  <EmailTemplateField
                    label="Email template"
                    options={selectedReason ? templateOptions : []}
                    value={selectedReason ? selectedTemplateId || null : null}
                    onValueChange={handleTemplateValueChange}
                    placeholder={selectedReason ? templatePlaceholder : 'Select a reason first'}
                    emptyMessage={selectedReason ? 'No matching templates found.' : 'Select a reason first.'}
                    loading={selectedReason !== null && !templatesReady}
                    disabled={!selectedReason || isPending || templatesError || templateOptions.length === 0}
                    errorMessage={
                      templatesError
                        ? 'Templates could not be loaded. You can still compose the email manually.'
                        : undefined
                    }
                    portalContainerRef={sheetContentRef}
                  />
                )}
              </div>

              {showEmailFields && (
                <>
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
                </>
              )}
            </FeatureSheetBody>

            <FeatureSheetFooter className="border-t-0">
              <Button variant="outline" onClick={handleCancel} disabled={isPending} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !canSubmit}>
                {isPending ? <Spinner data-icon="inline-start" /> : <ArchiveIcon data-icon="inline-start" />}
                {submitLabel}
              </Button>
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
