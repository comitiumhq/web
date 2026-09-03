import type { ApplicationApiResponse, OtherApplicationSummary } from '@comitium/schemas/applications';
import { useCallback, useMemo } from 'react';

interface BuildConsiderationsParams {
  application: ApplicationApiResponse | null;
  otherApplications: OtherApplicationSummary[];
  jobId: string;
  jobOnChainId: number | null;
  jobTitle: string | null;
  currentStageName: string | null;
}

interface UseConsiderationSelectionParams extends BuildConsiderationsParams {
  onApplicationSwitch?: (app: OtherApplicationSummary) => void;
  onNavigate?: (applicationId: string) => void;
}

function compareConsiderations(a: OtherApplicationSummary, b: OtherApplicationSummary): number {
  const dateComparison = b.appliedAt.localeCompare(a.appliedAt);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return b.id.localeCompare(a.id);
}

export function buildConsiderations({
  application,
  otherApplications,
  jobId,
  jobOnChainId,
  jobTitle,
  currentStageName,
}: BuildConsiderationsParams): OtherApplicationSummary[] {
  if (!application) {
    return [];
  }

  const current = {
    id: application.id,
    jobId,
    jobOnChainId,
    jobTitle,
    appliedAt: application.appliedAt,
    currentStageId: application.currentStageId,
    terminalOutcome: application.terminalOutcome,
    terminalOutcomeAt: application.terminalOutcomeAt,
    currentStageName,
    isResponded: application.isResponded,
    archivedAt: application.archivedAt,
    duplicateAttemptCount: application.duplicateAttemptCount,
  };

  const considerationsById = new Map(otherApplications.map((item) => [item.id, item]));
  considerationsById.set(current.id, current);

  return [...considerationsById.values()].sort(compareConsiderations);
}

export function getMergedConsiderationTotal(
  otherApplications: OtherApplicationSummary[],
  otherApplicationsTotal: number,
  currentApplicationId: string,
): number {
  const includesCurrentApplication = otherApplications.some((application) => application.id === currentApplicationId);

  return otherApplicationsTotal + (includesCurrentApplication ? 0 : 1);
}

export function useConsiderationSelection({
  application,
  otherApplications,
  jobId,
  jobOnChainId,
  jobTitle,
  currentStageName,
  onApplicationSwitch,
  onNavigate,
}: UseConsiderationSelectionParams) {
  const considerations = useMemo(
    () =>
      buildConsiderations({
        application,
        otherApplications,
        jobId,
        jobOnChainId,
        jobTitle,
        currentStageName,
      }),
    [application, currentStageName, jobId, jobOnChainId, jobTitle, otherApplications],
  );

  const handleApplicationClick = useCallback(
    (appId: string) => {
      const app = considerations.find((item) => item.id === appId);

      if (app && onApplicationSwitch) {
        onApplicationSwitch(app);

        return;
      }

      if (onNavigate) {
        onNavigate(appId);
      }
    },
    [considerations, onApplicationSwitch, onNavigate],
  );

  return { considerations, handleApplicationClick };
}
