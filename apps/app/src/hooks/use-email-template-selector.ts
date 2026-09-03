import type { TipTapDoc } from '@comitium/schemas/common';
import { useCallback, useMemo, useState } from 'react';
import { useQueryApplicationEmailTemplateOptions } from '@/hooks/queries/use-query-email-templates';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import type { EmailTemplateUseCase } from '@/lib/schemas/emails';
import { renderEmailTemplate } from '@/lib/utils/email-tokens';

interface TemplateSelectorOptions {
  applicationId: string;
  orgId: string;
  enabled: boolean;
  candidateFirstName?: string | null;
  jobTitle: string | null;
  useCase?: EmailTemplateUseCase;
  activityId?: string;
}

/**
 * Shared hook for email template selection and token resolution.
 * Returns TipTap JSON doc for rich text editing + resolved subject.
 * Used by candidate communication dialogs.
 */
export function useEmailTemplateSelector({
  applicationId,
  orgId,
  enabled,
  candidateFirstName,
  jobTitle,
  useCase,
  activityId,
}: TemplateSelectorOptions) {
  const templatesQuery = useQueryApplicationEmailTemplateOptions(enabled ? applicationId : undefined, {
    activityId,
    useCase,
  });
  const allTemplates = templatesQuery.data;
  const { data: orgDetails } = useQueryOrg(orgId);
  const { data: meData } = useQueryOrgMe(orgId);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageDoc, setMessageDoc] = useState<TipTapDoc | null>(null);
  const [resolvedSubject, setResolvedSubject] = useState('');

  const templates = useMemo(() => (allTemplates ?? []).filter((template) => !template.isArchived), [allTemplates]);
  const selectedTemplate = useMemo(
    () => allTemplates?.find((template) => template.id === selectedTemplateId) ?? null,
    [allTemplates, selectedTemplateId],
  );

  const tokenContext = useMemo(
    () => ({
      candidateFirstName,
      jobTitle,
      companyName: orgDetails?.name,
      senderName: meData?.name,
    }),
    [candidateFirstName, jobTitle, orgDetails?.name, meData?.name],
  );

  /** Select a template — resolves tokens in both subject and body in one pass. */
  const handleTemplateChange = useCallback(
    (templateId: string) => {
      if (!allTemplates) {
        return;
      }

      const template = allTemplates.find((item) => item.id === templateId);

      if (!template) {
        return;
      }

      const rendered = renderEmailTemplate(template, tokenContext);

      setSelectedTemplateId(templateId);
      setMessageDoc(rendered.body);
      setResolvedSubject(rendered.subject);
    },
    [allTemplates, tokenContext],
  );

  /** Reset selection, message doc, and subject. */
  const reset = useCallback(() => {
    setSelectedTemplateId('');
    setMessageDoc(null);
    setResolvedSubject('');
  }, []);

  return {
    templates,
    selectedTemplate,
    templatesReady: allTemplates !== undefined || templatesQuery.isError,
    templatesError: templatesQuery.isError,
    selectedTemplateId,
    messageDoc,
    resolvedSubject,
    senderName: meData?.name ?? orgDetails?.name ?? null,
    emailSignature: meData?.emailSignature ?? null,
    handleTemplateChange,
    reset,
  };
}
