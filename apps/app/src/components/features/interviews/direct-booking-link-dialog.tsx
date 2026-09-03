import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { EnvelopeIcon, SpinnerGapIcon, WarningIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
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

  const renderTemplateOption = useCallback(
    (template: (typeof dialog.templates)[number]) => (
      <SelectItem key={template.id} value={template.id}>
        {template.title} ({template.durationMinutes} min)
      </SelectItem>
    ),
    [],
  );
  const renderEmailTemplateOption = useCallback(
    (template: (typeof dialog.emailTemplates)[number]) => (
      <SelectItem key={template.id} value={template.id}>
        {template.name}
      </SelectItem>
    ),
    [],
  );

  return (
    <Sheet open={open} onOpenChange={dialog.handleOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b shrink-0">
          <SheetTitle>Send scheduling link</SheetTitle>
          <SheetDescription>Configure the interview and email the candidate a link to choose a time.</SheetDescription>
        </SheetHeader>

        <Form {...dialog.form}>
          <form onSubmit={dialog.form.handleSubmit(dialog.handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    <Select value={field.value} onValueChange={dialog.handleTemplateChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>{dialog.templates.map(renderTemplateOption)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DirectBookingInterviewerPicker
                members={dialog.orgMembers}
                calendarStatusMap={dialog.calendarStatusMap}
                interviewers={dialog.interviewers}
                disabled={!dialog.selectedInterviewId}
                onAdd={dialog.handleAddInterviewer}
                onRemove={dialog.handleRemoveInterviewer}
              />

              {dialog.emailTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label>Email template</Label>
                  <Select
                    value={dialog.selectedTemplateId}
                    onValueChange={dialog.handleEmailTemplateChange}
                    disabled={dialog.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>{dialog.emailTemplates.map(renderEmailTemplateOption)}</SelectContent>
                  </Select>
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
            </div>

            <SheetFooter className="border-t shrink-0 flex-row justify-end gap-2">
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
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
