const RESERVED_CAREERS_SLUGS = ['admin', 'api', 'app', 'apply', 'careers', 'jobs', 'org', 'settings', 'www'] as const;

type ReservedCareersSlug = (typeof RESERVED_CAREERS_SLUGS)[number];

export function isReservedCareersSlug(value: string): boolean {
  return RESERVED_CAREERS_SLUGS.includes(value as ReservedCareersSlug);
}
