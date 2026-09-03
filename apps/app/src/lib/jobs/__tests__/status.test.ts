import type { JobLifecycle } from '@comitium/schemas/public-jobs';
import { describe, expect, it } from 'vitest';
import { canRunJobLifecycleAction, isJobConfigurationReadOnly } from '../status';

function lifecycle(overrides: Partial<JobLifecycle> = {}): JobLifecycle {
  return {
    transition: null,
    commitmentFinalizationPending: false,
    activeApplications: 0,
    allowedActions: ['unpublish_job', 'close_job'],
    ...overrides,
  };
}

describe('job lifecycle status', () => {
  it('uses the derived lifecycle action contract', () => {
    const state = lifecycle();

    expect(canRunJobLifecycleAction(state, 'unpublish_job')).toBe(true);
    expect(canRunJobLifecycleAction(state, 'close_job')).toBe(true);
  });

  it('makes only closed Job configuration read-only', () => {
    expect(isJobConfigurationReadOnly('closed')).toBe(true);
    expect(isJobConfigurationReadOnly('open')).toBe(false);
    expect(isJobConfigurationReadOnly('draft')).toBe(false);
  });
});
