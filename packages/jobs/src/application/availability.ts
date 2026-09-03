import type { JobListItem } from '@comitium/schemas/public-jobs';

type PublicApplicationJob = Pick<JobListItem, 'status' | 'applyMode' | 'applicationCapacityAvailable'>;

export type PublicApplicationAvailability = 'accepting' | 'closed' | 'capacity-reached' | 'unavailable';

export function getPublicApplicationAvailability(job: PublicApplicationJob): PublicApplicationAvailability {
  if (job.status !== 'open') {
    return 'closed';
  }

  if (job.applyMode !== 'committed') {
    return 'unavailable';
  }

  if (!job.applicationCapacityAvailable) {
    return 'capacity-reached';
  }

  return 'accepting';
}
