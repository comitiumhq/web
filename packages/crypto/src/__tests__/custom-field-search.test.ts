import { describe, expect, it } from 'vitest';

import { isSearchableCustomFieldType, normalizeCustomFieldValue } from '../custom-field-search';

describe('normalizeCustomFieldValue', () => {
  it('normalizes categorical values', () => {
    expect(normalizeCustomFieldValue(' Yes ', 'yes_no')).toBe('yes');
    expect(normalizeCustomFieldValue('linkedin', 'multiple_choice')).toBe('linkedin');
  });

  it('uses a stable city ID for locations', () => {
    expect(normalizeCustomFieldValue({ cityId: 12345, city: 'Berlin', country: 'DE' }, 'location')).toBe('12345');
    expect(normalizeCustomFieldValue({ city: 'Berlin', country: 'DE' }, 'location')).toBe('');
    expect(normalizeCustomFieldValue(null, 'location')).toBe('');
  });
});

describe('isSearchableCustomFieldType', () => {
  it('accepts only exact-match custom fields with useful blind indexes', () => {
    expect(isSearchableCustomFieldType('yes_no')).toBe(true);
    expect(isSearchableCustomFieldType('multiple_choice')).toBe(true);
    expect(isSearchableCustomFieldType('location')).toBe(true);

    for (const fieldType of [
      'checkboxes',
      'date',
      'number',
      'phone',
      'email',
      'url',
      'employee',
      'short_answer',
      'long_unformatted',
    ]) {
      expect(isSearchableCustomFieldType(fieldType)).toBe(false);
    }
  });
});
