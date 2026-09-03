import type { StageType } from '@/lib/schemas/pipeline';

export interface EditorStage {
  clientId: string;
  id?: string;
  name: string;
  stageType: StageType;
}

export interface EditorState {
  name: string;
  stages: EditorStage[];
}
