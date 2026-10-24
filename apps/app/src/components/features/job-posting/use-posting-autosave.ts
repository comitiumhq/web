import type { JobPosting } from '@comitium/schemas/jobs';
import { useEffect, useRef, useState } from 'react';
import { useUpdateJobPosting } from '@/hooks/mutations/use-job-posting-mutations';
import { useAutosave } from '@/hooks/use-autosave';
import { toSkillSelections } from '@/lib/jobs/skills';
import { type PostingEditorState, postingToEditorState, preparePostingAutosave } from './posting-editor-state';

export function usePostingAutosave(orgId: string, jobId: string, posting: JobPosting | undefined, canEdit: boolean) {
  const [initialData, setInitialData] = useState<PostingEditorState | null>(null);
  const [data, setData] = useState<PostingEditorState>({});
  const version = useRef(0);
  const updatePosting = useUpdateJobPosting({ orgId, jobId });

  useEffect(() => {
    if (posting && initialData === null) {
      const fields = postingToEditorState(posting);

      setInitialData(fields);
      setData(fields);
      version.current = posting.version;
    }
  }, [posting, initialData]);

  const autosave = useAutosave({
    ...preparePostingAutosave(data, posting),
    initialData,
    enabled: canEdit && initialData !== null,
    onSave: async (changes) => {
      const saved = await updatePosting.mutateAsync({
        ...changes,
        skills: changes.skills ? toSkillSelections(changes.skills) : undefined,
        expectedVersion: version.current,
      });

      version.current = saved.version;
    },
  });

  useEffect(() => {
    if (!posting || !initialData) {
      return;
    }

    const hasLocalChanges = autosave.isDirty || autosave.isSaving || autosave.error;
    const canAcceptRefresh = !hasLocalChanges && posting.version > version.current;

    if (!canAcceptRefresh) {
      return;
    }

    const fields = postingToEditorState(posting);

    version.current = posting.version;
    setData(fields);
    autosave.acceptSavedData(fields);
  }, [posting, initialData, autosave.isDirty, autosave.isSaving, autosave.error, autosave.acceptSavedData]);

  return { autosave, data, setData, version, isInitialized: initialData !== null };
}
