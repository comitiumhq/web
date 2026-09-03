import { describe, expect, it } from 'vitest';

import { getInterviewerRsvpAccessibleLabel } from './interview-card';

describe('getInterviewerRsvpAccessibleLabel', () => {
  it('exposes the interviewer identity and invitation response to assistive technology', () => {
    expect(getInterviewerRsvpAccessibleLabel('Ari Singh', 'accepted')).toBe('Ari Singh. Invitation response accepted.');
    expect(getInterviewerRsvpAccessibleLabel('Ari Singh', null)).toBe('Ari Singh. Invitation response not recorded.');
  });
});
