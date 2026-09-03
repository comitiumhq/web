import { describe, expect, it } from 'vitest';

import { BACKGROUND_CONFIRMATION_COPY, getActionConfirmationPresentation } from './action-confirmation';

describe('action confirmation presentation', () => {
  it('shows a spinner only while foreground work is active', () => {
    expect(
      getActionConfirmationPresentation({
        idleLabel: 'Submit',
        pendingLabel: 'Submitting...',
        isPending: true,
        isConfirming: false,
      }),
    ).toEqual({ label: 'Submitting...', showSpinner: true });
  });

  it('uses a static disabled-action label after background handoff', () => {
    expect(
      getActionConfirmationPresentation({
        idleLabel: 'Submit',
        pendingLabel: 'Submitting...',
        isPending: false,
        isConfirming: true,
      }),
    ).toEqual({ label: BACKGROUND_CONFIRMATION_COPY.actionLabel, showSpinner: false });
  });
});
