import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { Link } from '@tanstack/react-router';
import { type KeyboardEvent, type MouseEvent, useCallback } from 'react';
import { getStageSince } from '@/components/features/application-status';
import {
  CriteriaBadge,
  getCriteriaLabel as getPipelineCriteriaLabel,
} from '@/components/features/pipeline/shared/criteria-badge';
import { getApplicationReviewUrgencyState } from '@/components/features/pipeline/shared/pipeline-status';
import { UrgencyStripe } from '@/components/features/pipeline/shared/urgency-stripe';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { formatCompactDate, formatElapsedDaysSince, formatRelativeTime, getCandidateDisplayName } from '@/lib/utils';

import type { PipelineTab } from '../../types';

export function getCandidateRowId(candidate: PipelineCandidate): string {
  return candidate.id;
}

function getCandidateSubtitle(
  candidate: PipelineCandidate,
  profile: CandidateProfile | null,
  includeJob: boolean,
): string {
  const jobTitle = candidate.jobTitle ?? 'Untitled job';
  const work = [profile?.currentTitle, profile?.currentCompany].filter(Boolean).join(' at ');

  if (work && includeJob) {
    return `${work} · ${jobTitle}`;
  }

  if (work) {
    return work;
  }

  if (includeJob) {
    return jobTitle;
  }

  if (profile?.location) {
    return profile.location;
  }

  return `Application ${candidate.id.slice(0, 8)}`;
}

export function CandidateIdentityCell({
  candidate,
  profile,
  showJob,
  showUrgencyStripe = false,
}: {
  candidate: PipelineCandidate;
  profile: CandidateProfile | null;
  showJob: boolean;
  showUrgencyStripe?: boolean;
}) {
  const candidateName = getCandidateDisplayName({
    applicationId: candidate.id,
    candidateId: candidate.candidateId,
    profile,
  });
  const candidateSubtitle = getCandidateSubtitle(candidate, profile, showJob);
  const urgency = showUrgencyStripe
    ? getApplicationReviewUrgencyState(candidate.isResponded, candidate.responseDeadline)
    : null;

  return (
    <div className="min-w-0">
      {urgency && <UrgencyStripe level={urgency.level} reason={urgency.reason} />}
      <p className="truncate text-label-14 text-foreground">{candidateName}</p>
      <p className="mt-1 truncate text-label-12 text-muted-foreground">
        {candidateSubtitle}
        {candidate.duplicateAttemptCount > 0 ? ` · ${candidate.duplicateAttemptCount + 1} application attempts` : ''}
      </p>
    </div>
  );
}

function getJobPipelineTab(candidate: PipelineCandidate): PipelineTab {
  if (candidate.archivedAt) {
    return 'archived';
  }

  if (candidate.stageType === 'review' || candidate.stageType === 'active') {
    return candidate.stageType;
  }

  if (candidate.stageType === 'offer' || candidate.stageType === 'hired') {
    return candidate.stageType;
  }

  return 'active';
}

export function JobCell({ candidate, orgId }: { candidate: PipelineCandidate; orgId: string }) {
  const jobTitle = candidate.jobTitle ?? 'Untitled job';
  const handleClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <Link
      to="/org/$orgId/jobs/$jobId/pipeline"
      params={{ orgId, jobId: candidate.jobId }}
      search={{ tab: getJobPipelineTab(candidate) }}
      className="block truncate rounded-md text-copy-14 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      title={jobTitle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {jobTitle}
    </Link>
  );
}

export function StageCell({ candidate }: { candidate: PipelineCandidate }) {
  const stageName = candidate.currentStageName ?? candidate.archivedAtStageName;

  return (
    <span className="block truncate text-copy-14 text-muted-foreground" title={stageName ?? undefined}>
      {stageName ?? '—'}
    </span>
  );
}

export function CriteriaCell({ candidate }: { candidate: PipelineCandidate }) {
  const label = getPipelineCriteriaLabel(candidate);

  if (label === '—') {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  return <CriteriaBadge candidate={candidate} />;
}

export function DateCell({ iso }: { iso: string | null }) {
  if (!iso) {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-copy-14 tabular-nums text-muted-foreground">{formatCompactDate(iso)}</span>
      </TooltipTrigger>
      <TooltipContent>{formatRelativeTime(iso)}</TooltipContent>
    </Tooltip>
  );
}

export function StageAgeCell({ candidate }: { candidate: PipelineCandidate }) {
  const enteredAt = getStageSince(candidate.currentStageEnteredAt, candidate.appliedAt);
  const elapsed = formatElapsedDaysSince(enteredAt);

  if (!enteredAt || !elapsed) {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={enteredAt} className="text-copy-14 tabular-nums text-muted-foreground">
          {elapsed}
        </time>
      </TooltipTrigger>
      <TooltipContent>Entered {formatCompactDate(enteredAt)}</TooltipContent>
    </Tooltip>
  );
}
