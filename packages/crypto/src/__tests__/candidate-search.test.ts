import { describe, expect, it } from 'vitest';
import type { CandidateSearchFields } from '../schemas/candidate-search-cache';
import { createCandidateIndex } from '../worker/candidate-search-index';
import { candidateProfileTerms, candidateQueryTerms, matchesCandidateExact } from '../worker/candidate-search-terms';

const anna: CandidateSearchFields = {
  firstName: 'ＡＮＮＡ',
  lastName: 'Müller',
  email: 'Anna+work@Example.TEST',
  location: { cityId: 756135, city: 'Warsaw', country: 'pl' },
  currentTitle: null,
  currentCompany: null,
};

const other: CandidateSearchFields = {
  firstName: 'Anna',
  lastName: 'Other',
  email: 'other@example.test',
  location: null,
  currentTitle: null,
  currentCompany: null,
};

async function search(query: string): Promise<number[]> {
  const index = createCandidateIndex();
  index.add(1, JSON.stringify(candidateProfileTerms(anna)));
  index.add(2, JSON.stringify(candidateProfileTerms(other)));

  return (await index.search(JSON.stringify(candidateQueryTerms(query)), { limit: 200 })).map(Number).sort();
}

describe('Candidate private matching contract', () => {
  it.each([
    ['ann', [1, 2]],
    ['anna mül', [1]],
    ['mül work', [1]],
    ['anna+work@example.t', [1]],
    ['ANNA+WORK@EXAMPLE.TEST', [1]],
    ['anna OR other', []],
    ['ado', []],
    ['anna+other@example.test', []],
  ] as const)('preserves AND-prefix and literal email semantics for %s', async (query, expected) => {
    expect(await search(query)).toEqual(expected);
  });

  it('does not truncate broad matches to the library default limit', async () => {
    const index = createCandidateIndex();

    for (let id = 1; id <= 250; id++) {
      index.add(id, JSON.stringify(['common']));
    }

    expect(await index.search(JSON.stringify(['com']), { limit: 250 })).toHaveLength(250);
  });

  it('applies exact email and canonical location to one profile', () => {
    expect(
      matchesCandidateExact(anna, { email: ' anna+work@example.test ', countries: ['PL'], cityIds: [756135] }),
    ).toBe(true);

    expect(matchesCandidateExact(anna, { countries: ['DE'] })).toBe(false);
    expect(matchesCandidateExact(null, { cityIds: [756135] })).toBe(false);
    expect(matchesCandidateExact(null, {})).toBe(true);
  });

  it('excludes phone, title, company and URLs from indexed tokens', () => {
    const profile = {
      ...anna,
      phone: '555111222',
      currentTitle: 'Architect',
      currentCompany: 'Contoso',
      website: 'https://secret.test',
    };

    const terms = candidateProfileTerms(profile);

    expect(terms).not.toContain('555111222');
    expect(terms).not.toContain('architect');
    expect(terms).not.toContain('contoso');
    expect(terms).not.toContain('secret');
  });

  it.each(['*', 'a '.repeat(13), 'x'.repeat(201)])('rejects unsupported private query input', (query) => {
    expect(() => candidateQueryTerms(query)).toThrow('INVALID_SEARCH');
  });

  it('bounds a dense record before expanding its prefixes', () => {
    expect(() => candidateProfileTerms({ ...anna, firstName: 'x'.repeat(2_000) })).toThrow('SEARCH_RESOURCE_LIMIT');
  });
});
