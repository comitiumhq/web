import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry } from '@comitium/schemas/jobs';
import type { SkillRequirement } from '@comitium/schemas/skills';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSaveJobEditor } from '@/components/features/job-settings/use-save-job-editor';
import { useQueryJobEditor } from '@/hooks/queries/use-query-job-editor';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import { useAutosave } from '@/hooks/use-autosave';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import { Permission } from '@/lib/schemas/org';
import {
  type JobAutosaveData,
  type JobConfigurationState,
  prepareJobAutosave,
} from '../job-settings/job-autosave-state';
import { draftToEditorState } from './draft-editor-state';

export function useDraftForm(orgId: string, jobId: string) {
  const { data: draft, isLoading, error } = useQueryJobEditor(orgId, jobId);
  const [description, setDescription] = useState<TipTapDoc | null>(null);
  const [skills, setSkills] = useState<SkillRequirement[]>([]);
  const [formId, setFormId] = useState<string | null>(null);
  const [interviewPlanId, setInterviewPlanId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [hiringTeam, setHiringTeam] = useState<HiringTeamEntry[]>([]);
  const [initialData, setInitialData] = useState<JobAutosaveData | null>(null);
  const isInitializedRef = useRef(false);
  const versionRef = useRef(0);

  const form = useForm<JobSettingsFormData>({
    resolver: zodResolver(JobSettingsFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
    },
  });

  const applySnapshot = useCallback(
    (snapshot: JobConfigurationState) => {
      form.reset(snapshot.values);
      setDescription(snapshot.description);
      setSkills(snapshot.skills);
      setFormId(snapshot.formId);
      setCriteria(snapshot.criteria);
      setInterviewPlanId(snapshot.interviewPlanId);
      setHiringTeam(snapshot.hiringTeam);
    },
    [form],
  );

  useEffect(() => {
    if (!draft || isInitializedRef.current) {
      return;
    }

    const snapshot = draftToEditorState(draft);

    versionRef.current = draft.version;
    applySnapshot(snapshot);
    setInitialData(prepareJobAutosave(snapshot).data);
    isInitializedRef.current = true;
  }, [applySnapshot, draft]);

  useWatch({ control: form.control });

  /**
   * Initialization can reset the form before the watch subscription is ready.
   * Read current values so mounting an editor never submits stale defaults.
   */
  const values = form.getValues();
  const { canOnJob } = useJobPermissions(jobId);
  const { data: summary } = useQueryJobSummary(jobId);
  const { mutateAsync: persistDraft } = useSaveJobEditor(orgId, jobId);
  const snapshot = prepareJobAutosave(
    { values, description, skills, formId, criteria, interviewPlanId, hiringTeam },
    { isPostingPublished: summary?.postingStatus === 'published' },
  );
  const isMutableJob = draft && draft.status !== 'closed' && !draft.archivedAt;
  const canAutosave = Boolean(initialData && isMutableJob && canOnJob(Permission.JOB_EDIT));
  const autosave = useAutosave({
    ...snapshot,
    initialData,
    enabled: canAutosave,
    onSave: async (changes) => {
      const result = await persistDraft({ ...changes, expectedVersion: versionRef.current });

      versionRef.current = result.version;
    },
  });

  useEffect(() => {
    if (!draft || !initialData) {
      return;
    }

    const hasLocalChanges = autosave.isDirty || autosave.isSaving || autosave.error;
    const canAcceptRefresh = !hasLocalChanges && draft.version > versionRef.current;

    if (!canAcceptRefresh) {
      return;
    }

    const next = draftToEditorState(draft);

    versionRef.current = draft.version;
    applySnapshot(next);
    autosave.acceptSavedData(prepareJobAutosave(next).data);
  }, [
    draft,
    initialData,
    autosave.isDirty,
    autosave.isSaving,
    autosave.error,
    autosave.acceptSavedData,
    applySnapshot,
  ]);

  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      const isTextField =
        name === 'title' || name === 'compensationMin' || name === 'compensationMax' || name === 'applicationCapacity';

      if (name && !isTextField) {
        autosave.saveImmediately();
      }
    });

    return () => subscription.unsubscribe();
  }, [form, autosave.saveImmediately]);

  const handleSkillsChange = useCallback(
    (updated: SkillRequirement[]) => {
      setSkills(updated);
      autosave.saveImmediately();
    },
    [autosave.saveImmediately],
  );

  const handleFormIdChange = useCallback(
    (next: string | null) => {
      setFormId(next);
      autosave.saveImmediately();
    },
    [autosave.saveImmediately],
  );

  const handleInterviewPlanChange = useCallback(
    (planId: string | null) => {
      setInterviewPlanId(planId);
      autosave.saveImmediately();
    },
    [autosave.saveImmediately],
  );

  const handleHiringTeamChange = useCallback(
    (team: HiringTeamEntry[]) => {
      setHiringTeam(team);
      autosave.saveImmediately();
    },
    [autosave.saveImmediately],
  );

  return {
    draft,
    isLoading: isLoading || Boolean(draft && initialData === null),
    error,
    form,
    isDirty: autosave.isDirty,
    isSaving: autosave.isSaving,
    autosave,
    description,
    skills,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    handleDescriptionChange: setDescription,
    handleSkillsChange,
    handleFormIdChange,
    handleCriteriaChange: setCriteria,
    handleInterviewPlanChange,
    handleHiringTeamChange,
  };
}
