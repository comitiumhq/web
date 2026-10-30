import { normalizeCandidateProfileSearchValue } from '../candidate-profile-search-hash';
import type { CandidateSearchFilter } from '../candidate-search-protocol';
import { SEARCH_WHITESPACE_REGEX, SEARCH_WORD_REGEX } from '../patterns';
import { CANDIDATE_SEARCH_CACHE_LIMITS, type CandidateSearchFields } from '../schemas/candidate-search-cache';
import { CandidateSearchError } from './candidate-search-error';

const encoder = new TextEncoder();
const MAX_CANDIDATE_SEARCH_TEXT_BYTES = 16 * 1024;

function normalizeCandidateSearchText(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function candidateProfileTerms(fields: CandidateSearchFields | null): string[] {
  const values = [fields?.firstName ?? '', fields?.lastName ?? '', fields?.email ?? ''];
  const rawBytes = values.reduce((sum, value) => sum + encoder.encode(value).byteLength, 0);

  if (rawBytes > MAX_CANDIDATE_SEARCH_TEXT_BYTES) {
    throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
  }

  const name = normalizeCandidateSearchText(`${fields?.firstName ?? ''} ${fields?.lastName ?? ''}`);
  const email = normalizeCandidateSearchText(fields?.email ?? '');
  const tooLarge = encoder.encode(name + email).byteLength > MAX_CANDIDATE_SEARCH_TEXT_BYTES;

  if (tooLarge) {
    throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
  }

  const terms = [
    ...new Set([
      ...(name.match(SEARCH_WORD_REGEX) ?? []),
      ...(email ? [email] : []),
      ...(email.match(SEARCH_WORD_REGEX) ?? []),
    ]),
  ];

  if (candidateExpandedTermBytes(terms) > CANDIDATE_SEARCH_CACHE_LIMITS.maxRecordExpandedBytes) {
    throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
  }

  return terms;
}

export function candidateQueryTerms(input: string): string[] {
  const query = normalizeCandidateSearchText(input);
  const terms: string[] = [];

  for (const part of query.split(SEARCH_WHITESPACE_REGEX)) {
    terms.push(...(part.includes('@') ? [part] : (part.match(SEARCH_WORD_REGEX) ?? [])));
  }

  const invalid = query.length > 200 || terms.length > 12 || (query && !terms.length);

  if (invalid) {
    throw new CandidateSearchError('INVALID_SEARCH');
  }

  return [...new Set(terms)];
}

export function matchesCandidateExact(fields: CandidateSearchFields | null, filter: CandidateSearchFilter): boolean {
  const email = normalizeCandidateProfileSearchValue('email', fields?.email ?? '');
  const country = fields?.location?.country
    ? normalizeCandidateProfileSearchValue('country', fields.location.country)
    : null;

  const city = fields?.location?.cityId;
  const matchesEmail = filter.email == null || email === normalizeCandidateProfileSearchValue('email', filter.email);
  const matchesCity = !filter.cityIds || Boolean(city && filter.cityIds.includes(city));
  const matchesCountry =
    !filter.countries ||
    Boolean(
      country && filter.countries.some((value) => normalizeCandidateProfileSearchValue('country', value) === country),
    );
  return matchesEmail && matchesCity && matchesCountry;
}

/**
 * Upper bound for UTF-16 forward-prefix characters, checked before the library allocates them.
 */
export function candidateExpandedTermBytes(terms: string[]): number {
  return terms.reduce((sum, term) => sum + term.length * (term.length + 1), 0);
}
