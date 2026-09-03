import { describe, expect, it } from 'vitest';

import { deriveTagHashKey, hmacTagLabel, normalizeTagLabel } from '../tag-hash';

describe('normalizeTagLabel', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeTagLabel('  Silver Medalist  ')).toBe('silver medalist');
  });

  it('preserves internal spaces and punctuation', () => {
    expect(normalizeTagLabel('Senior Eng 2024')).toBe('senior eng 2024');
    expect(normalizeTagLabel('react.js')).toBe('react.js');
    expect(normalizeTagLabel('backend-dev')).toBe('backend-dev');
    expect(normalizeTagLabel('senior_eng')).toBe('senior_eng');
  });

  it('collapses runs of internal whitespace to a single space', () => {
    expect(normalizeTagLabel('Senior  Engineer')).toBe('senior engineer');
    expect(normalizeTagLabel('Senior   Engineer')).toBe('senior engineer');
    expect(normalizeTagLabel('Senior\tEngineer')).toBe('senior engineer');
    expect(normalizeTagLabel('Senior\nEngineer')).toBe('senior engineer');
  });

  it('converges casing and spacing variants to the same form', () => {
    const baseline = normalizeTagLabel('Senior Engineer');
    const variants = [
      'senior engineer',
      'SENIOR ENGINEER',
      '  Senior Engineer  ',
      'Senior  Engineer',
      'Senior\tEngineer',
    ];

    for (const variant of variants) {
      expect(normalizeTagLabel(variant)).toBe(baseline);
    }
  });
});

describe('deriveTagHashKey', () => {
  const vaultPrivKey = new Uint8Array(32).fill(1);

  it('produces a 32-byte key', () => {
    const key = deriveTagHashKey(vaultPrivKey);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key).toHaveLength(32);
  });

  it('is deterministic for the same vault key', () => {
    expect(deriveTagHashKey(vaultPrivKey)).toEqual(deriveTagHashKey(vaultPrivKey));
  });

  it('differs when vault private key differs', () => {
    const otherKey = new Uint8Array(32).fill(2);
    expect(deriveTagHashKey(vaultPrivKey)).not.toEqual(deriveTagHashKey(otherKey));
  });
});

describe('hmacTagLabel', () => {
  const tagKey = new Uint8Array(32).fill(7);

  it('returns 64-char hex string', () => {
    const hash = hmacTagLabel(tagKey, 'silver-medalist');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    expect(hmacTagLabel(tagKey, 'silver-medalist')).toBe(hmacTagLabel(tagKey, 'silver-medalist'));
  });

  it('differs for different labels', () => {
    expect(hmacTagLabel(tagKey, 'silver-medalist')).not.toBe(hmacTagLabel(tagKey, 'senior-eng'));
  });

  it('collapses equivalent normalized forms when used with normalizeTagLabel', () => {
    const hashA = hmacTagLabel(tagKey, normalizeTagLabel('  Silver Medalist  '));
    const hashB = hmacTagLabel(tagKey, normalizeTagLabel('silver medalist'));
    expect(hashA).toBe(hashB);
  });

  it('differs for different tag keys', () => {
    const otherKey = new Uint8Array(32).fill(8);
    expect(hmacTagLabel(tagKey, 'silver-medalist')).not.toBe(hmacTagLabel(otherKey, 'silver-medalist'));
  });
});
