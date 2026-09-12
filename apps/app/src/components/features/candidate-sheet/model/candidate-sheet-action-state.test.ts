import type { CandidateSheetActionState } from '@comitium/schemas/applications';
import { describe, expect, it } from 'vitest';

import { getCandidateSheetEmptyActivityMessage } from './candidate-sheet-action-state';

const ACTIVITY_ID = '00000000-0000-4000-8000-000000000001';

describe('getCandidateSheetEmptyActivityMessage', () => {
  it('directs an authorized user to choose the next stage', () => {
    const actionState: CandidateSheetActionState = {
      status: 'action_required',
      blockedReason: null,
      nextAction: { kind: 'make_stage_decision', activityId: ACTIVITY_ID },
    };

    expect(getCandidateSheetEmptyActivityMessage(actionState)).toBe(
      'All current activities are complete. Choose the next stage.',
    );
  });

  it('explains that another user must make the stage decision', () => {
    const actionState: CandidateSheetActionState = {
      status: 'waiting_decision',
      blockedReason: null,
      nextAction: null,
    };

    expect(getCandidateSheetEmptyActivityMessage(actionState)).toBe(
      'All current activities are complete. Waiting for a stage decision.',
    );
  });
});
