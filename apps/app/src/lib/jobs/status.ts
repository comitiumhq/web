import type { JobLifecycle, JobLifecycleAction, JobStatus } from '@comitium/schemas/public-jobs';

export function isJobConfigurationReadOnly(status: JobStatus | null): boolean {
  return status === 'closed';
}

export function canRunJobLifecycleAction(lifecycle: JobLifecycle, action: JobLifecycleAction): boolean {
  return lifecycle.allowedActions.includes(action);
}
