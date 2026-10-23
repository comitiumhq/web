const RESERVED_CAREERS_SLUGS = ['admin', 'api', 'app', 'apply', 'careers', 'jobs', 'org', 'settings', 'www'] as const;

export const CAREERS_SLUG_MAX_LENGTH = 80;

export function suggestCareersSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CAREERS_SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function isReservedCareersSlug(value: string): boolean {
  return RESERVED_CAREERS_SLUGS.some((slug) => slug === value);
}
