import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
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
  publishErrors: PublishError[];
  stepStatuses: ReturnType<typeof getStepStatuses>;
  setPreviewOpen: (open: boolean) => void;
  handlePreviewClick: () => void;
  validatePublish: (formIsArchived: boolean) => boolean;
  handleValidationFieldClick: (tab: DraftTab) => void;
  dismissPublishErrors: () => void;
};

const DraftFormContext = createContext<DraftFormContextValue | null>(null);

export function DraftFormProvider({ orgId, jobId, children }: DraftFormProviderProps) {
  const navigate = useNavigate();
  const draftForm = useDraftForm(orgId, jobId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishErrors, setPublishErrors] = useState<PublishError[]>([]);

  const stepStatuses = useMemo(() => getStepStatuses(publishErrors), [publishErrors]);

  const handlePreviewClick = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const validatePublish = useCallback(
    (formIsArchived: boolean) => {
      if (draftForm.isDirty || draftForm.isSaving) {
        return false;
      }

      const values = draftForm.form.getValues() as JobSettingsFormData;
      const errors = validateForPublish({
        values,
        description: draftForm.description,
        formId: draftForm.formId,
        formIsArchived,
        criteria: draftForm.criteria,
        interviewPlanId: draftForm.interviewPlanId,
      });

      if (errors.length > 0) {
        setPublishErrors(errors);
        return false;
      }

      setPublishErrors([]);
      return true;
    },
    [
      draftForm.criteria,
      draftForm.description,
      draftForm.form,
      draftForm.formId,
      draftForm.interviewPlanId,
      draftForm.isDirty,
      draftForm.isSaving,
    ],
  );

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
      publishErrors,
      stepStatuses,
      setPreviewOpen,
      handlePreviewClick,
      validatePublish,
      handleValidationFieldClick,
      dismissPublishErrors,
    }),
    [
      dismissPublishErrors,
      draftForm,
      jobId,
      handlePreviewClick,
      handleValidationFieldClick,
      orgId,
      previewOpen,
      publishErrors,
      stepStatuses,
      validatePublish,
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
