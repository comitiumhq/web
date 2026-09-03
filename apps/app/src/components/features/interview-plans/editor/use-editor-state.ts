import { useCallback, useMemo, useState } from 'react';

import type { InterviewPlanDetail } from '@/lib/schemas/pipeline';
import { generateId } from '@/lib/utils';

import { createDefaultStages, editorStateToBody, templateToEditorState, validateEditorState } from './editor-utils';
import type { EditorStage, EditorState } from './types';

export function useEditorState(template?: InterviewPlanDetail) {
  const [state, setState] = useState<EditorState>(() => {
    if (template) {
      return templateToEditorState(template);
    }

    return { name: '', stages: createDefaultStages() };
  });

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const addStage = useCallback(() => {
    setState((prev) => {
      // Insert before Offer (second-to-last) — active stages go between Application Review and Offer
      const insertAt = prev.stages.length - 2;
      const newStage: EditorStage = { clientId: generateId(), name: '', stageType: 'active' };
      const newStages = [...prev.stages];

      newStages.splice(insertAt, 0, newStage);

      return { ...prev, stages: newStages };
    });
  }, []);

  const removeStage = useCallback((clientId: string) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.filter((s) => s.clientId !== clientId),
    }));
  }, []);

  const updateStageName = useCallback((clientId: string, name: string) => {
    setState((prev) => ({
      ...prev,
      stages: prev.stages.map((s) => (s.clientId === clientId ? { ...s, name } : s)),
    }));
  }, []);

  const reorderStages = useCallback((reordered: EditorStage[]) => {
    setState((prev) => ({ ...prev, stages: reordered }));
  }, []);

  const body = useMemo(() => editorStateToBody(state), [state]);
  const validationErrors = useMemo(() => validateEditorState(state), [state]);
  const isValid = validationErrors.length === 0;

  return {
    state,
    body,
    isValid,
    validationErrors,
    setName,
    addStage,
    removeStage,
    updateStageName,
    reorderStages,
  };
}
