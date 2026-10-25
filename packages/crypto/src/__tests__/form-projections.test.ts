import { describe, expect, it } from 'vitest';
import { projectConnectorAnswer } from '../form-projections';

describe('projectConnectorAnswer', () => {
  it('passes a string through for same-type text fields', () => {
    expect(projectConnectorAnswer('hello', 'short_answer', 'short_answer', null, null)).toBe('hello');
  });

  it('passes a string between compatible text fields', () => {
    expect(projectConnectorAnswer('hello', 'short_answer', 'long_unformatted', null, null)).toBe('hello');
  });

  it('rejects a value that does not match the target schema', () => {
    expect(projectConnectorAnswer('not a number', 'number', 'number', null, null)).toBeNull();
    expect(projectConnectorAnswer('not a date', 'date', 'date', null, null)).toBeNull();
  });

  it('returns null for null, undefined and empty answers', () => {
    expect(projectConnectorAnswer(null, 'short_answer', 'short_answer', null, null)).toBeNull();
    expect(projectConnectorAnswer(undefined, 'short_answer', 'short_answer', null, null)).toBeNull();
    expect(projectConnectorAnswer('', 'short_answer', 'short_answer', null, null)).toBeNull();
  });

  it('passes a string array through for checkboxes', () => {
    expect(projectConnectorAnswer(['a', 'b'], 'checkboxes', 'checkboxes', null, null)).toEqual(['a', 'b']);
  });

  it('preserves primitive values required by the target schema', () => {
    expect(projectConnectorAnswer(42, 'number', 'number', null, null)).toBe(42);
    expect(projectConnectorAnswer('yes', 'yes_no', 'yes_no', null, null)).toBe('yes');
  });

  it('preserves structured currency and location values', () => {
    const currency = { amount: 1_500, currency: 'USD' };
    const location = { cityId: 1, city: 'Warsaw', country: 'PL' };

    expect(projectConnectorAnswer(currency, 'currency', 'currency', null, null)).toEqual(currency);
    expect(projectConnectorAnswer(location, 'location', 'location', null, null)).toEqual(location);
  });

  describe('multiple_choice to checkboxes', () => {
    it('maps the source value to one target option', () => {
      const mapping = { tier_1: 'active', tier_2: 'passive' };

      expect(projectConnectorAnswer('tier_1', 'multiple_choice', 'checkboxes', mapping, null)).toEqual(['active']);
    });

    it('uses the fallback for an unmapped value', () => {
      const mapping = { tier_1: 'active' };

      expect(projectConnectorAnswer('tier_99', 'multiple_choice', 'checkboxes', mapping, 'other')).toEqual(['other']);
    });

    it('skips an unmapped value without a fallback', () => {
      const mapping = { tier_1: 'active' };

      expect(projectConnectorAnswer('tier_99', 'multiple_choice', 'checkboxes', mapping, null)).toBeNull();
    });

    it('rejects a source value that is not a string', () => {
      const mapping = { tier_1: 'active' };

      expect(projectConnectorAnswer(['tier_1'], 'multiple_choice', 'checkboxes', mapping, null)).toBeNull();
    });
  });

  describe('checkboxes to multiple_choice', () => {
    it('picks the first mapped source option', () => {
      const mapping = { tier_2: 'passive', tier_1: 'active' };

      expect(projectConnectorAnswer(['tier_2', 'tier_3'], 'checkboxes', 'multiple_choice', mapping, null)).toBe(
        'passive',
      );
    });

    it('uses the fallback when no source option is mapped', () => {
      const mapping = { tier_1: 'active' };

      expect(projectConnectorAnswer(['tier_5', 'tier_9'], 'checkboxes', 'multiple_choice', mapping, 'other')).toBe(
        'other',
      );
    });

    it('rejects a source value that is not an array', () => {
      const mapping = { tier_1: 'active' };

      expect(projectConnectorAnswer('tier_1', 'checkboxes', 'multiple_choice', mapping, null)).toBeNull();
    });
  });
});
