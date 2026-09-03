import { usdcToUsd } from '@comitium/chain/job-economics';
import type { ApplicationTerminalOutcome, MyApplicationResponse } from '@comitium/schemas/applications';
import { APPLICATION_TERMINAL_OUTCOME_LABEL } from '@comitium/ui/application-outcome-labels';
import { formatDate } from '@comitium/ui/date';
import { formatUsd } from '@comitium/ui/formatting';

type StatusVariant = 'default' | 'destructive' | 'info' | 'outline' | 'secondary' | 'success' | 'warning';
export type ApplicationFilter = 'active' | 'action' | 'closed';
type CandidateStatus = NonNullable<MyApplicationResponse['candidateStatus']>;
type ApplicationLifecycle = CandidateStatus['state'];
type ApplicationStatusReason = CandidateStatus['reason'] | ApplicationTerminalOutcome;

export interface ApplicationStatus {
  label: string;
  variant: StatusVariant;
  lifecycle: ApplicationLifecycle;
  reason: ApplicationStatusReason;
  filter: ApplicationFilter;
  needsAction: boolean;
  isClosed: boolean;
}

export interface Stats {
  total: number;
  active: number;
  action: number;
  closed: number;
}

const STATUS_META: Record<ApplicationLifecycle, { label: string; variant: StatusVariant }> = {
  submitted: { label: 'Submitted', variant: 'secondary' },
  in_process: { label: 'In process', variant: 'info' },
  action_needed: { label: 'Action needed', variant: 'warning' },
  application_closed: { label: 'Application closed', variant: 'outline' },
};

const TERMINAL_OUTCOME_META: Record<
  ApplicationTerminalOutcome,
  { label: string; variant: StatusVariant; description: string }
> = {
  hired: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.hired,
    variant: 'success',
    description: 'The employer marked this application as hired.',
  },
  employer_rejected: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.employer_rejected,
    variant: 'outline',
    description: 'The employer closed this application without moving forward.',
  },
  candidate_withdrew: {
    label: 'Withdrawn',
    variant: 'outline',
    description: 'This application was marked as withdrawn.',
  },
  candidate_unresponsive: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.candidate_unresponsive,
    variant: 'outline',
    description: 'The employer closed this application after no response.',
  },
  transferred: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.transferred,
    variant: 'info',
    description: 'The employer moved your candidacy to another role.',
  },
  employer_deadline_expired: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.employer_deadline_expired,
    variant: 'warning',
    description: 'The employer did not complete this hiring process before its deadline.',
  },
  imported_terminal_unknown: {
    label: APPLICATION_TERMINAL_OUTCOME_LABEL.imported_terminal_unknown,
    variant: 'outline',
    description: 'This historical application is closed.',
  },
};

function getCandidateStatus(app: MyApplicationResponse): CandidateStatus {
  return app.candidateStatus;
}

function getApplicationFilter(candidateStatus: CandidateStatus): ApplicationFilter {
  if (candidateStatus.state === 'application_closed') {
    return 'closed';
  }

  return 'active';
}

export function getApplicationStatus(app: MyApplicationResponse): ApplicationStatus {
  if (app.terminalOutcome) {
    const terminalMeta = TERMINAL_OUTCOME_META[app.terminalOutcome];

    return {
      label: terminalMeta.label,
      variant: terminalMeta.variant,
      lifecycle: 'application_closed',
      reason: app.terminalOutcome,
      filter: 'closed',
      needsAction: false,
      isClosed: true,
    };
  }

  const candidateStatus = getCandidateStatus(app);
  const meta = STATUS_META[candidateStatus.state];

  return {
    label: meta.label,
    variant: meta.variant,
    lifecycle: candidateStatus.state,
    reason: candidateStatus.reason,
    filter: getApplicationFilter(candidateStatus),
    needsAction: candidateStatus.needsAction,
    isClosed: candidateStatus.state === 'application_closed',
  };
}

export function matchesApplicationFilter(app: MyApplicationResponse, filter: ApplicationFilter): boolean {
  const status = getApplicationStatus(app);

  if (filter === 'action') {
    return status.needsAction;
  }

  if (filter === 'closed') {
    return status.isClosed;
  }

  return !status.isClosed;
}

export function formatStake(amount: string | null): string {
  if (!amount || amount === '0') {
    return formatUsd(0);
  }

  return formatUsd(usdcToUsd(BigInt(amount)));
}

export function getApplicationStatusDescription(app: MyApplicationResponse): string {
  const status = getApplicationStatus(app);

  if (app.terminalOutcome) {
    const description = TERMINAL_OUTCOME_META[app.terminalOutcome].description;

    if (app.terminalOutcomeAt) {
      return `${description} Recorded ${formatDate(app.terminalOutcomeAt)}.`;
    }

    return description;
  }

  switch (status.reason) {
    case 'response_received':
      return 'Recruiting process is active.';
    case 'response_overdue':
      return 'Response window passed.';
    case 'response_window_closed':
      return 'Response window passed and your deposit is settled.';
    case 'awaiting_response':
      if (app.responseDeadline) {
        return `Employer response due by ${formatDate(app.responseDeadline)}.`;
      }

      return 'Waiting for employer response.';
    default:
      return 'Recruiting process is active.';
  }
}

export function calculateStats(applications: MyApplicationResponse[]): Stats {
  return applications.reduce(
    (acc, app) => {
      const status = getApplicationStatus(app);

      acc.total++;

      if (!status.isClosed) {
        acc.active++;
      }

      if (status.needsAction) {
        acc.action++;
      }

      if (status.isClosed) {
        acc.closed++;
      }

      return acc;
    },
    { total: 0, active: 0, action: 0, closed: 0 } as Stats,
  );
}
