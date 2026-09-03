import type { KanbanResponse } from '@/lib/schemas/pipeline';

export function mergeKanbanStagePage(current: KanbanResponse, page: KanbanResponse, stageId: string): KanbanResponse {
  const nextStage = page.stages.find((stage) => stage.id === stageId);

  if (!nextStage) {
    return current;
  }

  return {
    ...current,
    stages: current.stages.map((stage) => {
      if (stage.id !== stageId) {
        return stage;
      }

      const applications = new Map(stage.applications.map((application) => [application.id, application]));

      for (const application of nextStage.applications) {
        applications.set(application.id, application);
      }

      return { ...nextStage, applications: [...applications.values()] };
    }),
  };
}
