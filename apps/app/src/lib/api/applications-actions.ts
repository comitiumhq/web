import { stageChangeSchema } from '@comitium/schemas/applications';

import { api } from './client';

export function changeStage(applicationId: string, stageId: string, expectedStageId: string) {
  return api.post(`/applications/${applicationId}/stage`, { stageId, expectedStageId }, stageChangeSchema);
}
