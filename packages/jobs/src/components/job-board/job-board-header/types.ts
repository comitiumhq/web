import type { JobsSearch } from '../../../schemas/jobs-search';

export type JobBoardFilters = Omit<JobsSearch, 'orgSlug' | 'postingSlug'>;

export interface ActiveFilterBadge {
  label: string;
  key: string;
}
