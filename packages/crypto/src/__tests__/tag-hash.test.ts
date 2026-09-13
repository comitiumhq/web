import { describe, expect, it } from 'vitest';

import { hashTagLabel, normalizeTagLabel } from '../tag-hash';

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

describe('hashTagLabel', () => {
  const vaultKey = new Uint8Array(32).fill(7);

  it('preserves the v1 wire contract', () => {
    expect(hashTagLabel(vaultKey, 'Senior Engineer')).toBe(
      'c095ecd8632ef5a0a5e43d22622e7b1e69ce996517868f2edb3366b341619e7c',
    );
  });

  it('normalizes labels and scopes digests to the vault key', () => {
    const digest = hashTagLabel(vaultKey, '  Silver Medalist  ');

    expect(digest).toBe(hashTagLabel(vaultKey, 'silver medalist'));
    expect(digest).not.toBe(hashTagLabel(vaultKey, 'senior engineer'));
    expect(digest).not.toBe(hashTagLabel(new Uint8Array(32).fill(8), 'silver medalist'));
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
