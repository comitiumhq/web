import type { CandidateProfile } from '@comitium/schemas/candidates';
import { formatCandidateName } from '@comitium/schemas/candidates';
import type { RowSelectionState } from '@tanstack/react-table';
import type { BulkOperation, BulkOperationItem } from '@/lib/schemas/bulk-operations';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';

export type PipelineBulkAction = 'assign_candidate_tag' | 'email' | 'archive';

export function reconcilePipelineBulkSelection(
  selection: RowSelectionState,
  visibleApplicationIds: readonly string[],
  maxItems: number | undefined,
): RowSelectionState {
  if (!maxItems) {
    return {};
  }

  const visibleIds = new Set(visibleApplicationIds);

  return Object.fromEntries(
    Object.entries(selection)
      .filter(([applicationId, selected]) => selected && visibleIds.has(applicationId))
      .slice(0, maxItems),
  );
}

export type PipelineBulkTarget = {
  item: BulkOperationItem;
  application: NonNullable<BulkOperationItem['application']> | null;
  pipelineApplication: PipelineCandidate | null;
  profile: CandidateProfile | null;
};

export function getPipelineBulkTargets(
  operation: BulkOperation | null,
  pipelineApplications: readonly PipelineCandidate[],
  namesMap: ReadonlyMap<string, CandidateProfile>,
) {
  if (!operation) {
    return [];
  }

  const pipelineApplicationsById = new Map(
    pipelineApplications.map((pipelineApplication) => [pipelineApplication.id, pipelineApplication]),
  );

  return operation.items.map((item): PipelineBulkTarget => {
    const pipelineApplication = pipelineApplicationsById.get(item.selectedTargetId) ?? null;

    return {
      item,
      application: item.application,
      pipelineApplication,
      profile: getCandidateProfile(pipelineApplication, namesMap),
    };
  });
}

function getCandidateProfile(
  pipelineApplication: PipelineCandidate | null,
  namesMap: ReadonlyMap<string, CandidateProfile>,
) {
  if (!pipelineApplication?.candidateId) return null;

  return namesMap.get(pipelineApplication.candidateId) ?? null;
}

export function getTargetLabel(target: PipelineBulkTarget) {
  return {
    candidateName: formatCandidateName(target.profile) ?? `Application ${shortId(target.item.selectedTargetId)}`,
    jobTitle: getTargetJobTitle(target),
  };
}

function getTargetJobTitle(target: PipelineBulkTarget) {
  if (target.pipelineApplication?.jobTitle) return target.pipelineApplication.jobTitle;
  if (target.application?.jobTitle) return target.application.jobTitle;
  if (target.application?.jobId) return `Job ${shortId(target.application.jobId)}`;

  return 'Job unavailable';
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export function getReadyTargets(targets: readonly PipelineBulkTarget[]) {
  return targets.filter((target) => target.item.status === 'ready');
}

export function getExcludedTargets(targets: readonly PipelineBulkTarget[]) {
  return targets.filter((target) => target.item.status === 'excluded');
}

export function getSucceededApplicationIds(operation: BulkOperation) {
  return operation.items.filter((item) => item.status === 'succeeded').map((item) => item.selectedTargetId);
}
