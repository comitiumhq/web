import { describe, expect, it } from 'vitest';

import { hashCustomFieldValue } from '../custom-field-hash';
import type { SearchableCustomFieldType } from '../custom-field-search';

const VAULT_KEY = new Uint8Array(32).fill(1);
const ORG_A = 'cab904f0-2db0-4e07-862e-f07fe34e7f49';
const ORG_B = '11111111-2222-3333-4444-555555555555';
const FIELD_A = '22222222-2222-4222-8222-222222222222';
const FIELD_B = '33333333-3333-4333-8333-333333333333';

describe('hashCustomFieldValue', () => {
  const hash = (
    value: unknown,
    orgId = ORG_A,
    fieldId = FIELD_A,
    fieldType: SearchableCustomFieldType = 'multiple_choice',
    vaultKey = VAULT_KEY,
  ) => hashCustomFieldValue(vaultKey, orgId, fieldId, fieldType, value);

  it('preserves the v1 wire contract', () => {
    expect(hash(' Platform ')).toBe('e65c079e49758b9805495ebf3a159667250bcda0a4046340df5370dc56b9dc38');
  });

  it('normalizes values and scopes digests to the vault, organization, field, and type', () => {
    const digest = hash(' Remote ');

    expect(digest).toBe(hash('remote'));
    expect(digest).not.toBe(hash('onsite'));
    expect(digest).not.toBe(hash('remote', ORG_B));
    expect(digest).not.toBe(hash('remote', ORG_A, FIELD_B));
    expect(digest).not.toBe(hash('remote', ORG_A, FIELD_A, 'yes_no'));
    expect(digest).not.toBe(hash('remote', ORG_A, FIELD_A, 'multiple_choice', new Uint8Array(32).fill(2)));
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
