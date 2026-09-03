import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry } from '@comitium/schemas/jobs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCreateJobTemplate, useUpdateJobTemplate } from '@/hooks/mutations/use-job-template-mutations';
import { useQueryJobTemplate } from '@/hooks/queries/use-query-job-templates';
import { type DraftFormData, DraftFormSchema } from '@/lib/schemas/draft-form';
import type { CreateJobTemplateBody } from '@/lib/schemas/job-templates';

import { buildCompensation, prepareEvaluationCriteria } from '../../job-draft/utils';

const EMPTY_FORM_VALUES: DraftFormData = { title: '' };

interface UseTemplateFormOptions {
  onSaved?: () => void;
  onCreated?: (templateId: string) => void;
}

export function useTemplateForm(orgId: string, templateId: string | null, options: UseTemplateFormOptions = {}) {
  const { onSaved, onCreated } = options;
  const { data: template, isLoading, error } = useQueryJobTemplate(orgId, templateId ?? undefined);

  const [description, setDescription] = useState<TipTapDoc | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [interviewPlanId, setInterviewPlanId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [hiringTeam, setHiringTeam] = useState<HiringTeamEntry[]>([]);
  const [nonFormDirty, setNonFormDirty] = useState(false);

  const isInitializedRef = useRef(false);

  const form = useForm<DraftFormData>({
    resolver: zodResolver(DraftFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const initFromTemplate = useCallback(() => {
    if (!template) {
      return;
    }

    const formValues: DraftFormData = {
      title: template.title,
      departmentId: template.departmentId ?? undefined,
      locationId: template.locationId ?? undefined,
      location: template.location ?? undefined,
      locationType: (template.locationType as DraftFormData['locationType']) ?? undefined,
      employmentType: (template.employmentType as DraftFormData['employmentType']) ?? undefined,
      category: (template.category as DraftFormData['category']) ?? undefined,
      compensationCurrency:
        (template.compensation?.tiers[0]?.currency as DraftFormData['compensationCurrency']) ?? undefined,
      compensationPeriod: (template.compensation?.tiers[0]?.period as DraftFormData['compensationPeriod']) ?? undefined,
      compensationMin: template.compensation?.tiers[0]?.base_min ?? undefined,
      compensationMax: template.compensation?.tiers[0]?.base_max ?? undefined,
    };

    form.reset(formValues);
    setDescription((template.description as TipTapDoc) ?? null);
    setFormId(template.formId ?? null);
    setCriteria((template.criteria as EvaluationCriterion[]) ?? []);
    setInterviewPlanId(template.interviewPlanId);
    setHiringTeam((template.hiringTeam as HiringTeamEntry[]) ?? []);
    setNonFormDirty(false);
  }, [form, template]);

  const resetToEmpty = useCallback(() => {
    form.reset(EMPTY_FORM_VALUES);
    setDescription(null);
    setFormId(null);
    setCriteria([]);
    setInterviewPlanId(null);
    setHiringTeam([]);
    setNonFormDirty(false);
  }, [form]);

  useEffect(() => {
    if (!template || isInitializedRef.current) {
      return;
    }

    initFromTemplate();
    isInitializedRef.current = true;
  }, [template, initFromTemplate]);

  const createMutation = useCreateJobTemplate();
  const updateMutation = useUpdateJobTemplate();

  const save = useCallback(() => {
    const v = form.getValues();
    const validCriteria = prepareEvaluationCriteria(criteria);
    const trimmedTitle = (v.title ?? '').trim();
    const isUpdating = templateId !== null;
    const shouldSendDepartment = !isUpdating || form.getFieldState('departmentId').isDirty;
    const shouldSendLocation = !isUpdating || form.getFieldState('locationId').isDirty;

    if (!trimmedTitle) {
      toast.error('Title is required');

      return;
    }

    const baseBody = {
      departmentId: shouldSendDepartment ? (v.departmentId ?? null) : undefined,
      locationId: shouldSendLocation ? (v.locationId ?? null) : undefined,
      employmentType: v.employmentType,
      category: v.category,
      compensation: buildCompensation(v) ?? undefined,
      description,
      formId,
      criteria: validCriteria,
      hiringTeam: hiringTeam.map((member) => ({ userId: member.userId, role: member.role })),
    };

    if (templateId) {
      updateMutation.mutate({ orgId, templateId, body: { title: trimmedTitle, ...baseBody } }, { onSuccess: onSaved });
    } else {
      createMutation.mutate(
        { orgId, body: { title: trimmedTitle, ...baseBody, interviewPlanId } as CreateJobTemplateBody },
        {
          onSuccess: (created) => {
            onCreated?.(created.id);
          },
        },
      );
    }
  }, [
    form,
    description,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    templateId,
    createMutation,
    updateMutation,
    orgId,
    onSaved,
    onCreated,
  ]);

  const discard = useCallback(() => {
    if (templateId) {
      initFromTemplate();
    } else {
      resetToEmpty();
    }
  }, [templateId, initFromTemplate, resetToEmpty]);

  const handleDescriptionChange = useCallback((content: TipTapDoc) => {
    setDescription(content);
    setNonFormDirty(true);
  }, []);

  const handleFormIdChange = useCallback((next: string | null) => {
    setFormId(next);
    setNonFormDirty(true);
  }, []);

  const handleCriteriaChange = useCallback((updated: EvaluationCriterion[]) => {
    setCriteria(updated);
    setNonFormDirty(true);
  }, []);

  const handleInterviewPlanChange = useCallback((planId: string | null) => {
    setInterviewPlanId(planId);
    setNonFormDirty(true);
  }, []);

  const handleHiringTeamChange = useCallback((team: HiringTeamEntry[]) => {
    setHiringTeam(team);
    setNonFormDirty(true);
  }, []);

  const isDirty = form.formState.isDirty || nonFormDirty;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return {
    template,
    isLoading,
    error,
    form,
    isDirty,
    isSaving,
    isNew: !templateId,
    save,
    discard,
    description,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    handleDescriptionChange,
    handleFormIdChange,
    handleCriteriaChange,
    handleInterviewPlanChange,
    handleHiringTeamChange,
  };
}
