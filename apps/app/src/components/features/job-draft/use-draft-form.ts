import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion, HiringTeamEntry } from '@comitium/schemas/jobs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSaveJobEditor } from '@/components/features/job-settings/use-save-job-editor';
import { useQueryJobEditor } from '@/hooks/queries/use-query-job-editor';
import { serializeJobDescription } from '@/lib/jobs/description';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import { type DraftEditorState, draftToEditorState, prepareDraftSave } from './draft-editor-state';

export function useDraftForm(orgId: string, jobId: string) {
  const { data: draft, isLoading, error } = useQueryJobEditor(orgId, jobId);
  const [description, setDescription] = useState<TipTapDoc | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [interviewPlanId, setInterviewPlanId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [hiringTeam, setHiringTeam] = useState<HiringTeamEntry[]>([]);
  const [nonFormDirty, setNonFormDirty] = useState(false);
  const [version, setVersion] = useState(0);
  const isInitializedRef = useRef(false);
  const isApplyingSnapshotRef = useRef(false);
  const editRevisionRef = useRef(0);
  const versionRef = useRef(0);

  const form = useForm<JobSettingsFormData>({
    resolver: zodResolver(JobSettingsFormSchema),
    defaultValues: {
      title: '',
    },
  });

  const applySnapshot = useCallback(
    (snapshot: DraftEditorState) => {
      isApplyingSnapshotRef.current = true;
      form.reset(snapshot.values);
      isApplyingSnapshotRef.current = false;
      setDescription(snapshot.description);
      setFormId(snapshot.formId);
      setCriteria(snapshot.criteria);
      setInterviewPlanId(snapshot.interviewPlanId);
      setHiringTeam(snapshot.hiringTeam);
      setNonFormDirty(false);
    },
    [form],
  );

  useEffect(() => {
    if (!draft || isInitializedRef.current) {
      return;
    }

    const snapshot = draftToEditorState(draft);

    versionRef.current = draft.version;
    setVersion(draft.version);
    applySnapshot(snapshot);
    isInitializedRef.current = true;
  }, [applySnapshot, draft]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (!isInitializedRef.current || isApplyingSnapshotRef.current) {
        return;
      }

      editRevisionRef.current += 1;
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const { mutateAsync: persistDraft, isPending: isSaving } = useSaveJobEditor(orgId, jobId);

  const markNonFormDirty = useCallback(() => {
    editRevisionRef.current += 1;
    setNonFormDirty(true);
  }, []);

  const currentSnapshot = useCallback(
    (): DraftEditorState => ({
      values: { ...form.getValues() },
      description,
      formId,
      criteria: [...criteria],
      interviewPlanId,
      hiringTeam: [...hiringTeam],
    }),
    [criteria, description, form, formId, hiringTeam, interviewPlanId],
  );

  const isDirty = form.formState.isDirty || nonFormDirty;

  const save = useCallback(async (): Promise<number | null> => {
    const isValid = await form.trigger();
    const values = form.getValues();

    if (!values.title.trim()) {
      form.setError('title', { message: 'Title is required' });

      return null;
    }

    if (!isValid) {
      return null;
    }

    if (!isDirty) {
      return versionRef.current;
    }

    const snapshot = currentSnapshot();
    const descriptionMarkdown = serializeJobDescription(snapshot.description);
    const prepared = prepareDraftSave(snapshot, versionRef.current, descriptionMarkdown);
    const submittedRevision = editRevisionRef.current;

    try {
      const result = await persistDraft(prepared.data);

      versionRef.current = result.version;
      setVersion(result.version);

      if (editRevisionRef.current === submittedRevision) {
        applySnapshot(prepared.state);
      }

      return result.version;
    } catch {
      return null;
    }
  }, [applySnapshot, currentSnapshot, form, isDirty, persistDraft]);

  const handleDescriptionChange = useCallback(
    (content: TipTapDoc) => {
      setDescription(content);
      markNonFormDirty();
    },
    [markNonFormDirty],
  );

  const handleFormIdChange = useCallback(
    (next: string | null) => {
      setFormId(next);
      markNonFormDirty();
    },
    [markNonFormDirty],
  );

  const handleCriteriaChange = useCallback(
    (updated: EvaluationCriterion[]) => {
      setCriteria(updated);
      markNonFormDirty();
    },
    [markNonFormDirty],
  );

  const handleInterviewPlanChange = useCallback(
    (planId: string | null) => {
      setInterviewPlanId(planId);
      markNonFormDirty();
    },
    [markNonFormDirty],
  );

  const handleHiringTeamChange = useCallback(
    (team: HiringTeamEntry[]) => {
      setHiringTeam(team);
      markNonFormDirty();
    },
    [markNonFormDirty],
  );

  const descriptionMarkdown = useMemo(() => serializeJobDescription(description), [description]);

  return {
    draft,
    isLoading,
    error,
    form,
    version,
    isDirty,
    isSaving,
    save,
    descriptionMarkdown,
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
