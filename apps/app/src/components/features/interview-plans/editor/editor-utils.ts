import type { InterviewPlanDetail, TemplateBody } from '@/lib/schemas/pipeline';
import { generateId } from '@/lib/utils';

import type { EditorStage, EditorState } from './types';

export function createDefaultStages(): EditorStage[] {
  return [
    { clientId: generateId(), name: 'Application Review', stageType: 'review' },
    { clientId: generateId(), name: 'Screen', stageType: 'active' },
    { clientId: generateId(), name: 'Interview', stageType: 'active' },
    { clientId: generateId(), name: 'Offer', stageType: 'offer' },
    { clientId: generateId(), name: 'Hired', stageType: 'hired' },
  ];
}

export function templateToEditorState(template: InterviewPlanDetail): EditorState {
  const sorted = template.stages.toSorted((a, b) => a.stageOrder - b.stageOrder);

  return {
    name: template.name,
    stages: sorted.map((s) => ({
      clientId: generateId(),
      id: s.id,
      name: s.name,
      stageType: s.stageType,
    })),
  };
}

export function editorStateToBody(state: EditorState): TemplateBody {
  const stages = state.stages.map((s, i) => ({
    id: s.id,
    name: s.name,
    stageOrder: i,
    stageType: s.stageType,
  }));

  return { name: state.name, stages };
}

export function validateEditorState(state: EditorState): string[] {
  const errors: string[] = [];

  if (!state.name.trim()) {
    errors.push('Template name is required');
  }

  if (state.stages.length < 4) {
    errors.push('Add at least one stage between Application Review and Offer');
  }

  if (state.stages.some((s) => !s.name.trim())) {
    errors.push('All stages must have a name');
  }

  return errors;
}
