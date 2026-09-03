import type { PublicEncryptionKey } from '@comitium/crypto';
import { BROWSER_TZ } from '@comitium/ui/date';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useQueryInterviewTemplates } from '@/hooks/queries/use-query-interview-templates';
import { useQueryCalendarStatus } from '@/hooks/queries/use-query-interviews';
import { useQueryOrgTeam, useQueryTeamCalendarStatusMap } from '@/hooks/queries/use-query-org-team';
import { useEmailTemplateSelector } from '@/hooks/use-email-template-selector';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import { createSchedulingEmailDoc } from '@/lib/applications/communication/direct-booking-link-email';
import type { OrgTeamMember } from '@/lib/schemas/org';
import type { DefaultInterviewer } from '@/lib/schemas/stage-activities';
import { appendSignature } from '@/lib/utils/email-tokens';

import { usePrefilledInterviewers } from './schedule-dialog/use-prefilled-interviewers';
import type { SelectedInterviewer } from './types';
import { useSendSchedulingLink } from './use-send-scheduling-link';

const directBookingFormSchema = z.object({
  interviewId: z.guid('Select an interview type'),
  durationMinutes: z.number().int().min(15).max(180),
  stageId: z.guid(),
  timeZone: z.string().min(1),
  subject: z.string().trim().min(1, 'Subject is required'),
});

type DirectBookingFormData = z.infer<typeof directBookingFormSchema>;

const DEFAULT_FORM_VALUES: DirectBookingFormData = {
  interviewId: '',
  durationMinutes: 60,
  stageId: '',
  timeZone: BROWSER_TZ,
  subject: 'Choose an interview time',
};

export interface UseDirectBookingLinkDialogParams {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  orgId: string;
  currentStageId?: string | null;
  candidateEmail?: string | null;
  candidateFirstName?: string | null;
  jobTitle: string | null;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
  prefillInterviewId?: string | null;
  prefillDefaultInterviewers?: DefaultInterviewer[] | null;
}

export function useDirectBookingLinkDialog({
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
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [interviewers, setInterviewers] = useState<SelectedInterviewer[]>([]);
  const { data: templatesData } = useQueryInterviewTemplates(orgId);
  const templates = useMemo(() => templatesData?.data ?? [], [templatesData]);
  const { data: meData } = useQueryOrgMe(orgId);
  const { data: calStatus } = useQueryCalendarStatus(orgId);
  const { data: orgMembers } = useQueryOrgTeam(orgId);
  const calendarStatusMap = useQueryTeamCalendarStatusMap(orgId);
  const initialTimeZone = meData?.timezone ?? BROWSER_TZ;
  const {
    templates: emailTemplates,
    selectedTemplateId,
    messageDoc,
    resolvedSubject,
    emailSignature,
    handleTemplateChange: handleEmailTemplateChange,
    reset: resetEmailTemplate,
  } = useEmailTemplateSelector({
    applicationId,
    orgId,
    enabled: open,
    candidateFirstName,
    jobTitle,
    useCase: 'interview_confirmation',
  });
  const defaultMessageDoc = useMemo(() => createSchedulingEmailDoc(candidateFirstName), [candidateFirstName]);
  const editorContent = useMemo(
    () => appendSignature(messageDoc ?? defaultMessageDoc, emailSignature),
    [defaultMessageDoc, emailSignature, messageDoc],
  );

  const form = useForm<DirectBookingFormData>({
    resolver: zodResolver(directBookingFormSchema),
    defaultValues: { ...DEFAULT_FORM_VALUES, stageId: currentStageId ?? '', timeZone: initialTimeZone },
  });

  const selectedInterviewId = useWatch({ control: form.control, name: 'interviewId' });
  const organizerCalendarConnected = calStatus?.calendarConnected === true;
  const canSubmit =
    Boolean(candidateEmail) &&
    Boolean(currentStageId) &&
    Boolean(selectedInterviewId) &&
    interviewers.length > 0 &&
    organizerCalendarConnected &&
    Boolean(vaultPublicKey) &&
    Boolean(vaultKeyVersion);

  const handleSent = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { sendSchedulingLink, isPending } = useSendSchedulingLink({
    applicationId,
    orgId,
    applicantEmail: candidateEmail ?? null,
    vaultPublicKey,
    vaultKeyVersion,
    onSent: handleSent,
  });

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      form.setValue('interviewId', templateId);

      const template = templates.find((entry) => entry.id === templateId);

      if (template) {
        form.setValue('durationMinutes', template.durationMinutes);
      }
    },
    [form, templates],
  );

  useEffect(() => {
    if (resolvedSubject) {
      form.setValue('subject', resolvedSubject);
    }
  }, [form, resolvedSubject]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!currentStageId) {
      toast.error('Cannot create link — application has no active stage');
      onOpenChange(false);

      return;
    }

    form.reset({ ...DEFAULT_FORM_VALUES, stageId: currentStageId, timeZone: initialTimeZone });
    setInterviewers([]);
    resetEmailTemplate();

    if (prefillInterviewId) {
      form.setValue('interviewId', prefillInterviewId);
    }
  }, [currentStageId, form, initialTimeZone, onOpenChange, open, prefillInterviewId, resetEmailTemplate]);

  useEffect(() => {
    const template = templates.find((entry) => entry.id === selectedInterviewId);

    if (template) {
      form.setValue('durationMinutes', template.durationMinutes);
    }
  }, [form, selectedInterviewId, templates]);

  usePrefilledInterviewers({
    open,
    orgId,
    prefillDefaults: prefillDefaultInterviewers,
    setInterviewers,
  });

  const handleAddInterviewer = useCallback((member: OrgTeamMember) => {
    setInterviewers((current) => [
      ...current,
      {
        userId: member.userId,
        member,
        role: 'interviewer',
      },
    ]);
  }, []);

  const handleRemoveInterviewer = useCallback((userId: string) => {
    setInterviewers((current) => current.filter((interviewer) => interviewer.userId !== userId));
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        onOpenChange(nextOpen);
      }
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const handleSubmit = useCallback(
    async (data: DirectBookingFormData) => {
      if (!candidateEmail) {
        toast.error('Candidate email is required');

        return;
      }

      if (!vaultPublicKey || !vaultKeyVersion) {
        toast.error('Vault key not available');

        return;
      }

      if (!editorRef.current || editorRef.current.isEmpty()) {
        toast.error('Please enter a message');

        return;
      }

      await sendSchedulingLink({
        interviewId: data.interviewId,
        durationMinutes: data.durationMinutes,
        stageId: data.stageId,
        timeZone: data.timeZone,
        interviewers: interviewers.map((interviewer) => ({
          userId: interviewer.userId,
          role: interviewer.role,
        })),
        subject: data.subject,
        messageDoc: editorRef.current.getJSON(),
        messageHtml: editorRef.current.getHTML(),
        emailTemplateId: selectedTemplateId || null,
      });
    },
    [candidateEmail, interviewers, selectedTemplateId, vaultKeyVersion, vaultPublicKey, sendSchedulingLink],
  );

  return {
    editorRef,
    form,
    templates,
    emailTemplates,
    selectedTemplateId,
    editorContent,
    selectedInterviewId,
    interviewers,
    orgMembers: orgMembers ?? [],
    calendarStatusMap,
    isPending,
    canSubmit,
    handleEmailTemplateChange,
    handleTemplateChange,
    handleAddInterviewer,
    handleRemoveInterviewer,
    handleOpenChange,
    handleCancel,
    handleSubmit,
  };
}
