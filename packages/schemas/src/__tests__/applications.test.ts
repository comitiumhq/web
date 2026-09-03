import type { PublicEncryptionKey, WrappedKey } from '@comitium/crypto';
import { base64 } from '@scure/base';
import { describe, expect, it } from 'vitest';
import {
  applicantStakeReturnAvailabilitySchema,
  applicationPreparationResultSchema,
  applicationPrepareSchema,
  applicationSearchProjectionSchema,
  applicationSubmitDispositionSchema,
  candidateSheetConsiderationContextSchema,
  criterionSummarySchema,
  finalizeApplicationInputSchema,
} from '../applications';

const ESCO_OCCUPATION_ID = 'http://data.europa.eu/esco/occupation/software-engineer';
const ONET_SOFTWARE_ID = 'urn:onet:software:275976081ce1abf67779eb3c388b5e14531082e52137502e264776e1a6a11595';
const UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HASH = `0x${'1'.repeat(64)}`;
const ADDRESS = `0x${'2'.repeat(40)}`;

function mockPublicEncryptionKey(): PublicEncryptionKey {
  return {
    v: 1,
    xwing: base64.encode(new Uint8Array(1216)),
  };
}

function mockWrappedKey(): WrappedKey {
  return {
    v: 1,
    ek: base64.encode(new Uint8Array(32)),
    epk: 'aa'.repeat(32),
    kemCt: base64.encode(new Uint8Array(1088)),
    iv: base64.encode(new Uint8Array(12)),
  };
}

describe('applicationSearchProjectionSchema', () => {
  it('accepts the combined ESCO and O*NET projection contract', () => {
    const result = applicationSearchProjectionSchema.safeParse({
      schemaVersion: 1,
      skillIds: [ONET_SOFTWARE_ID],
      occupationIds: [ESCO_OCCUPATION_ID],
    });

    expect(result.success).toBe(true);
  });

  it('rejects O*NET occupation IDs', () => {
    const invalidOccupation = applicationSearchProjectionSchema.safeParse({
      schemaVersion: 1,
      skillIds: [],
      occupationIds: [ONET_SOFTWARE_ID],
    });

    expect(invalidOccupation.success).toBe(false);
  });
});

describe('criterionSummarySchema', () => {
  it('accepts counts scoped by the containing application response', () => {
    const result = criterionSummarySchema.safeParse({
      totalCount: 3,
      metCount: 2,
      notMetCount: 1,
      undecidedCount: 0,
    });

    expect(result.success).toBe(true);
  });
});

describe('candidateSheetConsiderationContextSchema', () => {
  it('preserves selected-consideration attribution, hiring team, capabilities, and action state', () => {
    const result = candidateSheetConsiderationContextSchema.parse({
      job: {
        id: '00000000-0000-4000-8000-000000000001',
        title: 'Product Designer',
        status: 'open',
      },
      stage: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Application Review',
        enteredAt: '2026-07-16T10:00:00.000Z',
      },
      attribution: {
        origin: 'recruiter_add',
        sourceId: null,
        sourceName: 'Referral',
        creditedTo: '00000000-0000-4000-8000-000000000004',
      },
      hiringTeam: [
        {
          userId: '00000000-0000-4000-8000-000000000004',
          name: 'Nolan Price',
          role: 'hiring_manager',
        },
      ],
      lineage: {
        rootApplicationId: '00000000-0000-4000-8000-000000000003',
        currentApplicationId: '00000000-0000-4000-8000-000000000003',
        applicationIds: ['00000000-0000-4000-8000-000000000003'],
      },
      capabilities: {
        candidate: {
          canEditProfile: true,
          canManageFiles: true,
          canManageTags: true,
          canCreateNote: true,
          canViewPrivateData: false,
          canConsiderForJob: true,
        },
        consideration: {
          canMoveStage: true,
          canMarkHired: true,
          canArchive: true,
          canReopen: false,
          canTransfer: true,
          canSchedule: true,
          canSendEmail: true,
          canSubmitFeedback: true,
          canModerateFeedback: false,
        },
      },
      actionState: {
        status: 'action_required',
        blockedReason: null,
        nextAction: {
          kind: 'respond_to_application',
          responseDeadline: '2026-07-20T10:00:00.000Z',
        },
      },
      currentActivities: [],
    });

    expect(result.attribution.sourceName).toBe('Referral');
    expect(result.hiringTeam[0]?.name).toBe('Nolan Price');
    expect(result.capabilities.candidate.canEditProfile).toBe(true);
    expect(result.actionState.nextAction?.kind).toBe('respond_to_application');
  });
});

describe('applicant stake return contract', () => {
  it('accepts an applicant-wide direct wallet batch', () => {
    const availability = applicantStakeReturnAvailabilitySchema.parse({
      count: 2,
      totalAmount: '10000000',
      groups: [
        {
          chainId: 84_532,
          commitmentContract: ADDRESS,
          applicationIds: [HASH, HASH],
        },
      ],
    });

    expect(availability.count).toBe(2);
    expect(availability.groups[0]?.applicationIds).toHaveLength(2);
  });
});

describe('application submission contracts', () => {
  it('accepts preparation with the effective file policy', () => {
    const prepared = applicationPrepareSchema.parse({
      kind: 'prepared',
      formSnapshotHash: HASH,
      applicationId: UUID,
      processingGrant: {
        id: UUID,
        processorPublicKey: mockPublicEncryptionKey(),
      },
      filePolicy: {
        kinds: {
          resume: {
            maxPlaintextBytes: 1_000_000,
            mimeTypes: ['application/pdf'],
          },
          attachment: {
            maxPlaintextBytes: 1_000_000,
            mimeTypes: ['application/pdf'],
          },
        },
      },
      vaultKey: {
        vaultPublicKey: mockPublicEncryptionKey(),
        keyVersion: 1,
      },
    });

    expect(prepared.filePolicy.kinds.resume.maxPlaintextBytes).toBe(1_000_000);
    expect(prepared.vaultKey.keyVersion).toBe(1);
  });

  it('accepts executable and pending product dispositions', () => {
    const executable = applicationSubmitDispositionSchema.parse({
      state: 'wallet_confirmation',
      operation: {
        operationId: UUID,
        requestId: UUID,
        authorizationPayload: 'YXV0aG9yaXphdGlvbi1wYXlsb2Fk',
      },
    });
    const pending = applicationSubmitDispositionSchema.parse({
      state: 'confirming',
      operationId: UUID,
    });

    expect(executable.state).toBe('wallet_confirmation');
    expect(pending.state).toBe('confirming');
  });

  it('accepts an existing server-side submission after reload', () => {
    const result = applicationPreparationResultSchema.parse({
      kind: 'existing',
      applicationId: UUID,
      disposition: {
        state: 'confirming',
        operationId: UUID,
      },
    });

    expect(result.kind).toBe('existing');
  });

  it('finalizes typed application identities', () => {
    const wrapped = mockWrappedKey();
    const envelopeKey = {
      recipient: 'org_vault' as const,
      rkv: 1,
      ek: wrapped.ek,
      epk: wrapped.epk,
      kemCt: wrapped.kemCt,
      iv: wrapped.iv,
    };
    const envelope = {
      v: 1 as const,
      purpose: 'candidate_identity_input' as const,
      zip: 'none' as const,
      ct: wrapped.ek,
      iv: wrapped.iv,
      keys: [envelopeKey],
    };
    const profileEnvelope = { ...envelope, purpose: 'candidate_profile_input' as const };
    const input = finalizeApplicationInputSchema.parse({
      stake: '5000000',
      applicationId: HASH,
      applicationSalt: `0x${'3'.repeat(64)}`,
      formSnapshotHash: HASH,
      candidateIdentityInputs: [{ questionId: UUID, envelope }],
      candidateProfileInput: profileEnvelope,
      answerEnvelopes: [],
      fieldValues: [],
      uploadedFileIds: [],
      aiCriteriaEvaluation: { policyEnabled: true, optOut: false },
      processingGrantId: UUID,
      wrappedKeys: [
        {
          slot: 'identity',
          purpose: 'candidate_identity_input',
          subjectId: UUID,
          fieldId: UUID,
          wrappedKey: { ...envelopeKey, recipient: `processor:${UUID}` },
        },
        {
          slot: 'profile',
          purpose: 'candidate_profile_input',
          subjectId: UUID,
          fieldId: 'profile',
          wrappedKey: { ...envelopeKey, recipient: `processor:${UUID}` },
        },
      ],
    });

    expect(input.candidateIdentityInputs).toEqual([
      {
        questionId: UUID,
        envelope: expect.objectContaining({ purpose: 'candidate_identity_input' }),
      },
    ]);
    expect(input.candidateProfileInput.purpose).toBe('candidate_profile_input');
    expect(input.stake).toBe('5000000');
  });
});
