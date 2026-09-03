export const jobsQueryKeys = {
  careerPage: (orgSlug: string, filters: unknown) => ['careers', orgSlug, filters] as const,
  careerJobs: (orgSlug: string, filters: unknown) => ['careers', orgSlug, 'jobs-list', filters] as const,
  careerJob: (orgSlug: string | null, postingSlug: string | null) => ['careers', orgSlug, 'jobs', postingSlug] as const,
  careerLocations: (orgSlug: string) => ['careers', orgSlug, 'locations'] as const,
  locations: () => ['locations'] as const,
  publicList: (filters: unknown) => ['jobs', filters] as const,
};
