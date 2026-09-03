export const qk = {
  auth: {
    sessionRoot: () => ['auth', 'session'] as const,
    session: (privyUserId: string | null) => ['auth', 'session', privyUserId] as const,
  },
  cities: {
    search: (query: string) => ['cities', query] as const,
  },
  orgs: {
    my: () => ['orgs', 'my'] as const,
  },
  application: {
    my: () => ['applications', 'my'] as const,
    stakeReturn: () => ['applications', 'my', 'stake-return'] as const,
    applicantStake: (commitmentContract: string) => ['application-stake', commitmentContract] as const,
  },
  publicSchedule: {
    state: (token: string) => ['public-schedule', token, 'state'] as const,
    slots: (token: string, from: string, to: string, timeZone: string) =>
      ['public-schedule', token, 'slots', from, to, timeZone] as const,
  },
  careers: {
    all: () => ['careers'] as const,
    applyForm: (target: unknown) => ['career-apply-form', target] as const,
    page: (orgSlug: string, filters: unknown) => ['careers', orgSlug, filters] as const,
    jobsList: (orgSlug: string, filters: unknown) => ['careers', orgSlug, 'jobs-list', filters] as const,
    job: (orgSlug: string | null, postingSlug: string | null) => ['careers', orgSlug, 'jobs', postingSlug] as const,
    locations: (orgSlug: string) => ['careers', orgSlug, 'locations'] as const,
  },
  jobs: {
    publicList: (
      status: unknown,
      category: unknown,
      location: unknown,
      employmentType: unknown,
      search: unknown,
      locationType: unknown,
      salaryMin: unknown,
      salaryMax: unknown,
      sort: unknown,
      limit: unknown,
    ) =>
      [
        'jobs',
        status,
        category,
        location,
        employmentType,
        search,
        locationType,
        salaryMin,
        salaryMax,
        sort,
        limit,
      ] as const,
  },
  jobConfig: {
    locations: () => ['locations'] as const,
  },
};
