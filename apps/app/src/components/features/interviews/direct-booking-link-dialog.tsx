import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Combobox } from '@comitium/ui/combobox';
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
import { EnvelopeIcon, SpinnerGapIcon, WarningIcon } from '@phosphor-icons/react';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import { DirectBookingInterviewerPicker } from './direct-booking-interviewer-picker';
import { type UseDirectBookingLinkDialogParams, useDirectBookingLinkDialog } from './use-direct-booking-link-dialog';

export function DirectBookingLinkDialog({
  open,
  onOpenChange,
  applicationId,
  orgId,
  currentStageId,
  candidateEmail,
  candidateFirstName,
  jobTitle,
  vaultPublicKey,
  vaultKeyVersion,
  prefillInterviewId,
  prefillDefaultInterviewers,
}: UseDirectBookingLinkDialogParams) {
  const dialog = useDirectBookingLinkDialog({
    open,
    onOpenChange,
    applicationId,
    orgId,
    currentStageId,
    candidateEmail,
    candidateFirstName,
    jobTitle,
    vaultPublicKey,
    vaultKeyVersion,
    prefillInterviewId,
    prefillDefaultInterviewers,
  });

  return (
    <Sheet open={open} onOpenChange={dialog.handleOpenChange}>
      <FeatureSheetContent side="right" size="editor">
        <FeatureSheetHeader>
          <SheetTitle>Send scheduling link</SheetTitle>
          <SheetDescription>Configure the interview and email the candidate a link to choose a time.</SheetDescription>
        </FeatureSheetHeader>

        <Form {...dialog.form}>
          <form onSubmit={dialog.form.handleSubmit(dialog.handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <FeatureSheetBody className="space-y-4">
              {!candidateEmail && (
                <Alert variant="warning">
                  <WarningIcon />
                  <AlertTitle>Candidate email unavailable</AlertTitle>
                  <AlertDescription>Unlock candidate data before sending a scheduling link.</AlertDescription>
                </Alert>
              )}

              <FormField
                control={dialog.form.control}
                name="interviewId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interview type</FormLabel>
                    <FormControl>
                      <Combobox
                        ariaLabel="Interview type"
                        options={dialog.templates.map((template) => ({
                          value: template.id,
                          label: `${template.title} (${template.durationMinutes} min)`,
                        }))}
                        value={field.value || null}
                        onValueChange={dialog.handleTemplateChange}
                        placeholder="Select interview type"
                        searchPlaceholder="Search interview types…"
                        emptyMessage="No interview types found."
                        clearLabel="Clear interview type"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DirectBookingInterviewerPicker
                members={dialog.orgMembers}
                calendarStatusMap={dialog.calendarStatusMap}
                interviewers={dialog.interviewers}
                disabled={!dialog.selectedInterviewId}
                onChange={dialog.handleInterviewersChange}
              />

              {dialog.emailTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label>Email template</Label>
                  <Combobox
                    ariaLabel="Email template"
                    options={dialog.emailTemplates.map((template) => ({ value: template.id, label: template.name }))}
                    value={dialog.selectedTemplateId || null}
                    onValueChange={(nextValue) => dialog.handleEmailTemplateChange(nextValue ?? '')}
                    placeholder="Select a template (optional)"
                    searchPlaceholder="Search email templates…"
                    emptyMessage="No email templates found."
                    clearLabel="Clear email template"
                    disabled={dialog.isPending}
                  />
                </div>
              )}

              <FormField
                control={dialog.form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Email subject" disabled={dialog.isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Message</Label>
                <RichTextEditor
                  content={dialog.editorContent}
                  handleRef={dialog.editorRef}
                  disabled={dialog.isPending}
                  toolbar={<EditorToolbar />}
                  compact
                />
                <p className="text-copy-14 text-muted-foreground">The scheduling link is added below your message.</p>
              </div>
            </FeatureSheetBody>

            <FeatureSheetFooter>
              <Button type="button" variant="outline" onClick={dialog.handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={dialog.isPending || !dialog.canSubmit}>
                {dialog.isPending ? (
                  <SpinnerGapIcon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <EnvelopeIcon className="mr-2 h-4 w-4" />
                )}
                Send scheduling link
              </Button>
            </FeatureSheetFooter>
          </form>
        </Form>
      </FeatureSheetContent>
    </Sheet>
  );
}
