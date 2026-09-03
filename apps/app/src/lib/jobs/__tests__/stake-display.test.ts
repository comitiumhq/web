import { describe, expect, it } from 'vitest';

import { formatEmployerStake, formatEmployerStakeLabel } from '../stake-display';

describe('stake-display', () => {
  it('formats whole USDC stake amounts as USD', () => {
    expect(formatEmployerStake('300000000')).toBe('$300');
  });

  it('builds short stake labels', () => {
    expect(formatEmployerStakeLabel('180000000', 'staked')).toBe('$180 staked');
  });
});
