import type { JobLifecycle } from '@comitium/schemas/public-jobs';
import { describe, expect, it } from 'vitest';
import { canRunJobLifecycleAction, isJobConfigurationReadOnly } from '../status';

function lifecycle(overrides: Partial<JobLifecycle> = {}): JobLifecycle {
  return {
    activeApplications: 0,
    allowedActions: ['close_job', 'publish_posting'],
    ...overrides,
  };
}

describe('job lifecycle status', () => {
  it('uses the derived lifecycle action contract', () => {
    const state = lifecycle();

    expect(canRunJobLifecycleAction(state, 'close_job')).toBe(true);
    expect(canRunJobLifecycleAction(state, 'publish_posting')).toBe(true);

    expect(canRunJobLifecycleAction(state, 'reopen_as_draft')).toBe(false);
  });

  it('makes only closed Job configuration read-only', () => {
    expect(isJobConfigurationReadOnly('closed')).toBe(true);
    expect(isJobConfigurationReadOnly('open')).toBe(false);
    expect(isJobConfigurationReadOnly('draft')).toBe(false);
  });
});
