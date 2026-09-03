import type { TipTapDoc } from '@comitium/schemas/common';
import type { SearchSelectOption } from '@comitium/ui/search-select';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { EMPTY_DOC, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useQueryApplicationEmailTemplateOptions } from '@/hooks/queries/use-query-email-templates';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { ComposeEmailData, EmailTemplateUseCase } from '@/lib/schemas/emails';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { appendSignature } from '@/lib/utils/email-tokens';

const draftContentSchema = z
  .object({
    subject: z.string().trim().min(1, 'Enter an email subject.'),
    messageText: z.string().trim().min(1, 'Enter an email message.'),
    signatureText: z.string(),
  })
  .refine(({ messageText, signatureText }) => messageText !== signatureText, {
    message: 'Enter an email message.',
    path: ['messageText'],
  });

interface UseBulkEmailDraftParams {
  applicationId: string | undefined;
  orgId: string;
  open: boolean;
  useCase?: EmailTemplateUseCase;
}

export interface BulkEmailDraft extends ComposeEmailData {
  companyName: string | null;
  senderName: string | null;
}

export function useBulkEmailDraft({ applicationId, orgId, open, useCase }: UseBulkEmailDraftParams) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const templatesQuery = useQueryApplicationEmailTemplateOptions(open ? applicationId : undefined, { useCase });
  const { data: org } = useQueryOrg(orgId);
  const { data: me } = useQueryOrgMe(orgId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState<TipTapDoc | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);

  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => !template.isArchived),
    [templatesQuery.data],
  );

  const templateOptions = useMemo<SearchSelectOption[]>(
    () => templates.map((template) => ({ value: template.id, label: template.name, searchValue: template.name })),
    [templates],
  );

  const editorContent = useMemo(() => appendSignature(body, me?.emailSignature ?? null) ?? EMPTY_DOC, [body, me]);

  const signatureText = useMemo(
    () => (me?.emailSignature ? tipTapToPlainText(me.emailSignature).trim() : ''),
    [me?.emailSignature],
  );

  const reset = useCallback(() => {
    setSelectedTemplateId(null);
    setSubject('');
    setBody(null);
    setEditorRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    reset();
  }, [reset, useCase]);

  const handleTemplateChange = useCallback(
    (templateId: string | null) => {
      const template = templates.find((item) => item.id === templateId);

      if (!template) return;

      setSelectedTemplateId(template.id);
      setSubject(template.subject);
      setBody(template.body);
      setEditorRevision((current) => current + 1);
    },
    [templates],
  );

  const readDraft = useCallback((): { draft: BulkEmailDraft | null; error: string | null } => {
    const editor = editorRef.current;

    if (!editor) {
      return { draft: null, error: 'The message editor is not ready.' };
    }

    const messageDoc = editor.getJSON();
    const validation = draftContentSchema.safeParse({
      subject,
      messageText: tipTapToPlainText(messageDoc),
      signatureText,
    });

    if (!validation.success) {
      return { draft: null, error: validation.error.issues[0]?.message ?? 'Review the email content.' };
    }

    return {
      draft: {
        subject: validation.data.subject,
        messageDoc,
        messageHtml: editor.getHTML(),
        emailTemplateId: selectedTemplateId ?? undefined,
        companyName: org?.name ?? null,
        senderName: me?.name ?? org?.name ?? null,
      },
      error: null,
    };
  }, [me?.name, org?.name, selectedTemplateId, signatureText, subject]);

  return {
    editorRef,
    editorKey: `${selectedTemplateId ?? 'manual'}-${editorRevision}`,
    editorContent,
    subject,
    setSubject,
    senderName: me?.name ?? org?.name ?? null,
    selectedTemplateId,
    templateOptions,
    templatesReady: templatesQuery.data !== undefined || templatesQuery.isError,
    templatesError: templatesQuery.isError,
    handleTemplateChange,
    readDraft,
  };
}

export type BulkEmailDraftController = ReturnType<typeof useBulkEmailDraft>;
