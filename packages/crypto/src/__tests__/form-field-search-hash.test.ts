import { describe, expect, it } from 'vitest';

import { hashCategoricalFormFieldValue } from '../form-field-search-hash';

const VAULT_KEY = new Uint8Array(32).fill(7);
const ORG_ID = '11111111-1111-4111-8111-111111111111';
const FIELD_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_FIELD_ID = '44444444-4444-4444-8444-444444444444';

describe('hashCategoricalFormFieldValue', () => {
  it('preserves the v1 wire contract', () => {
    expect(hashCategoricalFormFieldValue(VAULT_KEY, ORG_ID, FIELD_ID, 'option', 'platform')).toBe(
      'aa8942e5020427e4cb20c9a0d85b26e5c17a6c1943a055b095bec89b1b91e564',
    );
  });

  it('is deterministic and scoped to the reusable field and value kind', () => {
    const digest = hashCategoricalFormFieldValue(VAULT_KEY, ORG_ID, FIELD_ID, 'option', 'platform');

    expect(hashCategoricalFormFieldValue(VAULT_KEY, ORG_ID, FIELD_ID, 'option', 'platform')).toBe(digest);
    expect(hashCategoricalFormFieldValue(VAULT_KEY, ORG_ID, OTHER_FIELD_ID, 'option', 'platform')).not.toBe(digest);
    expect(hashCategoricalFormFieldValue(VAULT_KEY, ORG_ID, FIELD_ID, 'boolean', 'platform')).not.toBe(digest);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
