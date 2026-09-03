import { describe, expect, it } from 'vitest';

import { optionsToSelectableValues, selectableValuesToOptions } from './question-form';

describe('question option identity', () => {
  it('preserves existing option values when labels are edited', () => {
    const options = selectableValuesToOptions([
      { label: 'Original label', value: 'opaque-option-id', isArchived: true },
    ]);

    options[0] = { ...options[0], label: 'Renamed label' };

    expect(optionsToSelectableValues(options)).toEqual([
      { label: 'Renamed label', value: 'opaque-option-id', isArchived: true },
    ]);
  });

  it('creates deterministic unique values for new options', () => {
    expect(optionsToSelectableValues([{ label: 'Security' }, { label: 'Security!' }])).toEqual([
      { label: 'Security', value: 'security' },
      { label: 'Security!', value: 'security_x' },
    ]);
  });
});
