import { describe, expect, it } from 'vitest';

import { INTERVIEW_STATUS_DISPLAY } from './interview-status-display';

describe('interview status display', () => {
  it('uses quiet semantic badge variants', () => {
    expect(INTERVIEW_STATUS_DISPLAY.scheduled.variant).toBe('success');
    expect(INTERVIEW_STATUS_DISPLAY.in_progress.variant).toBe('warning');
    expect(INTERVIEW_STATUS_DISPLAY.completed.variant).toBe('success');
  });
});
