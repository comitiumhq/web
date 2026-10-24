import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry } from '@comitium/schemas/jobs';
import type { SkillRequirement } from '@comitium/schemas/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { useCreateJobTemplate, useUpdateJobTemplate } from '@/hooks/mutations/use-job-template-mutations';
import { useQueryJobTemplate } from '@/hooks/queries/use-query-job-templates';
import { useAutosave } from '@/hooks/use-autosave';
import { usePermissions } from '@/hooks/use-permissions';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import type { UpdateJobTemplateBody } from '@/lib/schemas/job-templates';
import { Permission } from '@/lib/schemas/org';
import { prepareTemplateAutosave, prepareTemplateCreate, templateToEditorState } from './template-editor-state';

const EMPTY_FORM_VALUES: JobSettingsFormData = { title: '' };

interface UseTemplateFormOptions {
  onCreated?: (templateId: string) => void;
}

export function useTemplateForm(orgId: string, templateId: string | null, options: UseTemplateFormOptions = {}) {
  const { onCreated } = options;
  const { data: template, isLoading, error } = useQueryJobTemplate(orgId, templateId ?? undefined);

  const [description, setDescription] = useState<TipTapDoc | null>(null);
  const [skills, setSkills] = useState<SkillRequirement[]>([]);
  const [formId, setFormId] = useState<string | null>(null);
  const [interviewPlanId, setInterviewPlanId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [hiringTeam, setHiringTeam] = useState<HiringTeamEntry[]>([]);
  const [nonFormDirty, setNonFormDirty] = useState(false);
  const [initialData, setInitialData] = useState<UpdateJobTemplateBody | null>(null);

  const isInitializedRef = useRef(false);

  const form = useForm<JobSettingsFormData>({
    resolver: zodResolver(JobSettingsFormSchema),
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!template || isInitializedRef.current) {
      return;
    }

    const state = templateToEditorState(template);

    form.reset(state.values);
    setDescription(state.description);
    setSkills(state.skills);
    setFormId(state.formId);
    setCriteria(state.criteria);
    setInterviewPlanId(state.interviewPlanId);
    setHiringTeam(state.hiringTeam);
    setNonFormDirty(false);
    setInitialData(prepareTemplateAutosave(state).data);
    isInitializedRef.current = true;
  }, [form, template]);

  const { can } = usePermissions();
  const readOnly = template?.status === 'archived' || !can(Permission.JOB_TEMPLATE_WRITE);
  const createMutation = useCreateJobTemplate();
  const updateMutation = useUpdateJobTemplate();

  useWatch({ control: form.control });

  /**
   * Initialization can reset the form before the watch subscription is ready.
   * Read current values so mounting an editor never submits stale defaults.
   */
  const values = form.getValues();
  const state = {
    values,
    description,
    skills,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
  };
  const snapshot = prepareTemplateAutosave(state);
  const canAutosave = Boolean(templateId && template && !readOnly);
  const autosave = useAutosave({
    ...snapshot,
    initialData,
    enabled: canAutosave,
    onSave: async (body) => {
      if (!templateId) {
        return;
      }

      await updateMutation.mutateAsync({ orgId, templateId, body });
    },
  });

  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      const isTextField = name === 'title' || name === 'compensationMin' || name === 'compensationMax';

      if (name && !isTextField) {
        autosave.saveImmediately();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, autosave.saveImmediately]);

  const create = async () => {
    if (readOnly || templateId) {
      return;
    }

    if (!(await form.trigger())) {
      return;
    }

    if (snapshot.blockedKeys.length > 0) {
      toast.error('Complete the required fields before creating this template');

      return;
    }

    createMutation.mutate(
      { orgId, body: prepareTemplateCreate(state) },
      { onSuccess: (created) => onCreated?.(created.id) },
    );
  };

  const handleDescriptionChange = useCallback((content: TipTapDoc) => {
    setDescription(content);
    setNonFormDirty(true);
  }, []);

  const handleSkillsChange = useCallback(
    (updated: SkillRequirement[]) => {
      setSkills(updated);
      autosave.saveImmediately();
      setNonFormDirty(true);
    },
    [autosave.saveImmediately],
  );

  const handleFormIdChange = useCallback(
    (next: string | null) => {
      setFormId(next);
      autosave.saveImmediately();
      setNonFormDirty(true);
    },
    [autosave.saveImmediately],
  );

  const handleCriteriaChange = useCallback((updated: EvaluationCriterion[]) => {
    setCriteria(updated);
    setNonFormDirty(true);
  }, []);

  const handleInterviewPlanChange = useCallback(
    (planId: string | null) => {
      setInterviewPlanId(planId);
      autosave.saveImmediately();
      setNonFormDirty(true);
    },
    [autosave.saveImmediately],
  );

  const handleHiringTeamChange = useCallback(
    (team: HiringTeamEntry[]) => {
      setHiringTeam(team);
      autosave.saveImmediately();
      setNonFormDirty(true);
    },
    [autosave.saveImmediately],
  );

  const isDirty = templateId ? autosave.isDirty : form.formState.isDirty || nonFormDirty;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return {
    template,
    isLoading: isLoading || Boolean(templateId && template && initialData === null),
    error,
    form,
    isDirty,
    isSaving,
    autosave,
    isNew: !templateId,
    readOnly,
    create,
    description,
    skills,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    handleDescriptionChange,
    handleSkillsChange,
    handleFormIdChange,
    handleCriteriaChange,
    handleInterviewPlanChange,
    handleHiringTeamChange,
  };
}
