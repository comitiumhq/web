import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { DraftFormData } from '@/lib/schemas/draft-form';
import { DraftNavigationGuard } from './draft-navigation-guard';
import { type DraftTab, getDraftSection } from './sections';
import { useDraftForm } from './use-draft-form';
import { getStepStatuses, type PublishError, validateForPublish } from './utils';

interface DraftFormProviderProps {
  orgId: string;
  jobId: string;
  children: ReactNode;
}

type DraftFormContextValue = ReturnType<typeof useDraftForm> & {
  orgId: string;
  jobId: string;
  previewOpen: boolean;
  publishOpen: boolean;
  publishVersion: number | null;
  publishErrors: PublishError[];
  stepStatuses: ReturnType<typeof getStepStatuses>;
  setPreviewOpen: (open: boolean) => void;
  setPublishOpen: (open: boolean) => void;
  handlePreviewClick: () => void;
  handlePublishClick: () => void;
  handleValidationFieldClick: (tab: DraftTab) => void;
  dismissPublishErrors: () => void;
};

const DraftFormContext = createContext<DraftFormContextValue | null>(null);

export function DraftFormProvider({ orgId, jobId, children }: DraftFormProviderProps) {
  const navigate = useNavigate();
  const draftForm = useDraftForm(orgId, jobId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishVersion, setPublishVersion] = useState<number | null>(null);
  const [publishErrors, setPublishErrors] = useState<PublishError[]>([]);

  const stepStatuses = useMemo(() => getStepStatuses(publishErrors), [publishErrors]);

  const handlePreviewClick = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const handlePublishOpenChange = useCallback((open: boolean) => {
    setPublishOpen(open);
  }, []);

  const handlePublishClick = useCallback(() => {
    if (draftForm.isDirty || draftForm.isSaving) {
      return;
    }

    const values = draftForm.form.getValues() as DraftFormData;
    const errors = validateForPublish(values, draftForm.description, draftForm.formId, draftForm.criteria);

    if (errors.length > 0) {
      setPublishErrors(errors);
      return;
    }

    setPublishErrors([]);
    setPublishVersion(draftForm.version);
    setPublishOpen(true);
  }, [
    draftForm.criteria,
    draftForm.description,
    draftForm.form,
    draftForm.formId,
    draftForm.isDirty,
    draftForm.isSaving,
    draftForm.version,
  ]);

  const handleValidationFieldClick = useCallback(
    (tab: DraftTab) => {
      setPublishErrors([]);
      navigate({
        to: getDraftSection(tab).route,
        params: { orgId, jobId },
      });
    },
    [jobId, navigate, orgId],
  );

  const dismissPublishErrors = useCallback(() => {
    setPublishErrors([]);
  }, []);

  const value = useMemo(
    () => ({
      ...draftForm,
      orgId,
      jobId,
      previewOpen,
      publishOpen,
      publishVersion,
      publishErrors,
      stepStatuses,
      setPreviewOpen,
      setPublishOpen: handlePublishOpenChange,
      handlePreviewClick,
      handlePublishClick,
      handleValidationFieldClick,
      dismissPublishErrors,
    }),
    [
      dismissPublishErrors,
      draftForm,
      jobId,
      handlePublishOpenChange,
      handlePreviewClick,
      handlePublishClick,
      handleValidationFieldClick,
      orgId,
      previewOpen,
      publishErrors,
      publishOpen,
      publishVersion,
      stepStatuses,
    ],
  );

  return (
    <DraftFormContext.Provider value={value}>
      {children}
      <DraftNavigationGuard orgId={orgId} jobId={jobId} enabled={draftForm.isDirty} />
    </DraftFormContext.Provider>
  );
}

export function useDraftFormContext() {
  const context = useContext(DraftFormContext);

  if (!context) {
    throw new Error('useDraftFormContext must be used inside DraftFormProvider');
  }

  return context;
}

export function useOptionalDraftFormContext() {
  return useContext(DraftFormContext);
}
