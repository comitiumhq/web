import { describe, expect, it } from 'vitest';

import { uuidSchema } from '../public';

describe('common schemas', () => {
  it('accepts UUID strings', () => {
    const value = '550e8400-e29b-41d4-a716-446655440000';

    expect(uuidSchema.parse(value)).toBe(value);
  });

  it('accepts PostgreSQL-compatible UUID strings without requiring a version nibble', () => {
    const value = '00000000-0000-0000-0000-000000000001';

    expect(uuidSchema.parse(value)).toBe(value);
  });

  it('rejects non-UUID strings', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
  });
});
