import type { ApplicationTerminalOutcome } from '@comitium/schemas/applications';

export const APPLICATION_TERMINAL_OUTCOME_LABEL: Record<ApplicationTerminalOutcome, string> = {
  hired: 'Hired',
  employer_rejected: 'Not selected',
  candidate_withdrew: 'Candidate withdrew',
  candidate_unresponsive: 'Candidate unresponsive',
  transferred: 'Transferred',
  employer_deadline_expired: 'Employer deadline expired',
  imported_terminal_unknown: 'Closed',
};
