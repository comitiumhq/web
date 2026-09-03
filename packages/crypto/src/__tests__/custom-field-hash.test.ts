import { describe, expect, it } from 'vitest';

import {
  deriveCustomFieldHashKey,
  hmacCustomFieldValue,
  isSearchableFieldType,
  normalizeCustomFieldValue,
} from '../custom-field-hash';

const VAULT_KEY = new Uint8Array(32).fill(1);
const ORG_A = 'cab904f0-2db0-4e07-862e-f07fe34e7f49';
const ORG_B = '11111111-2222-3333-4444-555555555555';
const FIELD_A = '22222222-2222-4222-8222-222222222222';
const FIELD_B = '33333333-3333-4333-8333-333333333333';

describe('deriveCustomFieldHashKey', () => {
  it('binds the key to its v1 context', () => {
    const key = deriveCustomFieldHashKey(VAULT_KEY, ORG_A, FIELD_A, 'multiple_choice');

    expect(key).toHaveLength(32);
    expect(key).toEqual(deriveCustomFieldHashKey(VAULT_KEY, ORG_A, FIELD_A, 'multiple_choice'));
    expect(key).not.toEqual(deriveCustomFieldHashKey(VAULT_KEY, ORG_B, FIELD_A, 'multiple_choice'));
    expect(key).not.toEqual(deriveCustomFieldHashKey(VAULT_KEY, ORG_A, FIELD_B, 'multiple_choice'));
    expect(key).not.toEqual(deriveCustomFieldHashKey(VAULT_KEY, ORG_A, FIELD_A, 'yes_no'));
    expect(deriveCustomFieldHashKey(VAULT_KEY, ORG_A, FIELD_A, 'multiple_choice')).not.toEqual(
      deriveCustomFieldHashKey(new Uint8Array(32).fill(2), ORG_A, FIELD_A, 'multiple_choice'),
    );
  });
});

describe('normalizeCustomFieldValue', () => {
  it('choice — lowercase trim only', () => {
    expect(normalizeCustomFieldValue(' Yes ', 'yes_no')).toBe('yes');
    expect(normalizeCustomFieldValue('linkedin', 'multiple_choice')).toBe('linkedin');
  });

  it('location — uses cityId (stable across name renames); empty when cityId missing', () => {
    expect(normalizeCustomFieldValue({ cityId: 12345, city: 'Berlin', country: 'DE' }, 'location')).toBe('12345');
    expect(normalizeCustomFieldValue({ city: 'Berlin', country: 'DE' }, 'location')).toBe('');
    expect(normalizeCustomFieldValue(null, 'location')).toBe('');
  });

  it('throws for non-searchable types', () => {
    expect(() => normalizeCustomFieldValue('x', 'checkboxes')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'email')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'phone')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'url')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'date')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'number')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'employee')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'resume')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'short_answer')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'long_unformatted')).toThrow();
    expect(() => normalizeCustomFieldValue('x', 'currency')).toThrow();
  });
});

describe('isSearchableFieldType', () => {
  it('returns true for faceted-filter types (yes_no, multiple_choice, location)', () => {
    expect(isSearchableFieldType('yes_no')).toBe(true);
    expect(isSearchableFieldType('multiple_choice')).toBe(true);
    expect(isSearchableFieldType('location')).toBe(true);
  });

  it('returns false for checkboxes (multi-value: needs per-value rows, not single hash)', () => {
    expect(isSearchableFieldType('checkboxes')).toBe(false);
  });

  it('returns false for types where exact-match HMAC has marginal or no value', () => {
    expect(isSearchableFieldType('date')).toBe(false);
    expect(isSearchableFieldType('number')).toBe(false);
    expect(isSearchableFieldType('phone')).toBe(false);
    expect(isSearchableFieldType('email')).toBe(false);
    expect(isSearchableFieldType('url')).toBe(false);
    expect(isSearchableFieldType('employee')).toBe(false);
    expect(isSearchableFieldType('short_answer')).toBe(false);
    expect(isSearchableFieldType('long_unformatted')).toBe(false);
  });
});

describe('hmacCustomFieldValue', () => {
  const key = new Uint8Array(32).fill(7);

  it('returns 64-char hex string', () => {
    expect(hmacCustomFieldValue(key, 'foo@bar.com')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    expect(hmacCustomFieldValue(key, 'foo@bar.com')).toBe(hmacCustomFieldValue(key, 'foo@bar.com'));
  });

  it('differs for different inputs', () => {
    expect(hmacCustomFieldValue(key, 'foo@bar.com')).not.toBe(hmacCustomFieldValue(key, 'baz@qux.com'));
  });

  it('differs for different keys (org isolation)', () => {
    const otherKey = new Uint8Array(32).fill(8);
    expect(hmacCustomFieldValue(key, 'foo@bar.com')).not.toBe(hmacCustomFieldValue(otherKey, 'foo@bar.com'));
  });

  it('collapses equivalent normalized forms', () => {
    const hashA = hmacCustomFieldValue(key, normalizeCustomFieldValue(' Senior ', 'multiple_choice'));
    const hashB = hmacCustomFieldValue(key, normalizeCustomFieldValue('senior', 'multiple_choice'));
    expect(hashA).toBe(hashB);
  });
});
